"""
Audio manager for Archess game.
Handles sound effects and background music using pygame.mixer.
"""
from __future__ import annotations

import os
from typing import Dict, Optional, Tuple
from dataclasses import dataclass

import pygame
from pygame import mixer

from archess.app.config import audio_config
from archess.app.bootstrap.logging import get_logger


@dataclass
class SoundEffect:
    """Represents a sound effect."""
    name: str
    sound: pygame.mixer.Sound
    volume: float = 1.0


class AudioManager:
    """
    Manages audio for the Archess game.
    Handles sound effects and background music.
    """

    def __init__(self):
        self.logger = get_logger()
        self.is_initialized = False
        self.master_volume = audio_config.master_volume
        self.sfx_volume = audio_config.sfx_volume
        self.music_volume = audio_config.music_volume
        self.enable_audio = audio_config.enable_audio

        # Audio resources
        self.sound_effects: Dict[str, SoundEffect] = {}
        self.current_music: Optional[str] = None
        self.music_paused = False

        # Audio channels
        self.sfx_channel: Optional[pygame.mixer.Channel] = None
        self.music_channel: Optional[pygame.mixer.Channel] = None

        self.logger.info("audio_manager_created")

    def initialize(self) -> bool:
        """
        Initialize the audio manager and pygame mixer.

        Returns:
            bool: True if initialization successful
        """
        if not self.enable_audio:
            self.logger.info("audio_disabled_in_config")
            return True

        try:
            self.logger.info("audio_manager_initializing")

            # Initialize pygame mixer
            mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
            self.logger.info("pygame_mixer_initialized")

            # Set up channels
            mixer.set_num_channels(8)  # Reserve channels for different audio types
            self.sfx_channel = mixer.Channel(0)  # SFX on channel 0
            self.music_channel = mixer.Channel(1)  # Music on channel 1

            # Load default sound effects (placeholder - in real game these would be actual files)
            self._load_placeholder_sounds()

            self.is_initialized = True
            self.logger.info("audio_manager_initialized")
            return True

        except Exception as e:
            self.logger.error(
                "audio_manager_initialization_failed",
                error=str(e),
                error_type=type(e).__name__
            )
            return False

    def _load_placeholder_sounds(self) -> None:
        """Load placeholder sound effects (beep tones for testing)."""
        # Create simple beep sounds for testing since we don't have actual audio files
        # In a real implementation, these would be loaded from audio files

        # Generate simple sine wave beeps for different events
        sample_rate = 22050
        duration = 0.1  # seconds

        # Menu click sound (higher pitch)
        menu_click = self._generate_beep(800, duration, sample_rate)
        self.sound_effects["menu_click"] = SoundEffect("menu_click", menu_click, 0.5)

        # Piece launch sound (medium pitch)
        launch_sound = self._generate_beep(600, duration, sample_rate)
        self.sound_effects["piece_launch"] = SoundEffect("piece_launch", launch_sound, 0.7)

        # Hit sound (medium-high pitch)
        hit_sound = self._generate_beep(700, duration, sample_rate)
        self.sound_effects["hit"] = SoundEffect("hit", hit_sound, 0.6)

        # Collision sound (lower pitch)
        collision_sound = self._generate_beep(200, duration * 2, sample_rate)
        self.sound_effects["collision"] = SoundEffect("collision", collision_sound, 0.8)

        # King hit sound (special sound)
        king_hit_sound = self._generate_beep(100, duration * 3, sample_rate)
        self.sound_effects["king_hit"] = SoundEffect("king_hit", king_hit_sound, 1.0)

        # Game over sound
        game_over_sound = self._generate_beep_sweep(400, 100, duration * 2, sample_rate)
        self.sound_effects["game_over"] = SoundEffect("game_over", game_over_sound, 0.9)

        self.logger.info(f"loaded_placeholder_sounds: {len(self.sound_effects)} effects")

    def _generate_beep(self, frequency: float, duration: float, sample_rate: int) -> pygame.mixer.Sound:
        """Generate a simple beep sound."""
        import numpy as np
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        wave = np.sin(frequency * 2 * np.pi * t) * 0.5
        # Convert to 16-bit integers
        audio = (wave * 32767).astype(np.int16)
        # Make stereo
        stereo = np.column_stack((audio, audio))
        return pygame.sndarray.make_sound(stereo)

    def _generate_beep_sweep(self, start_freq: float, end_freq: float, duration: float, sample_rate: int) -> pygame.mixer.Sound:
        """Generate a beep that sweeps from start_freq to end_freq."""
        import numpy as np
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        # Linear frequency sweep
        freq = np.linspace(start_freq, end_freq, len(t))
        wave = np.sin(2 * np.pi * freq * t) * 0.5
        # Convert to 16-bit integers
        audio = (wave * 32767).astype(np.int16)
        # Make stereo
        stereo = np.column_stack((audio, audio))
        return pygame.sndarray.make_sound(stereo)

    def play_sound_effect(self, effect_name: str) -> bool:
        """
        Play a sound effect.

        Args:
            effect_name: Name of the sound effect to play

        Returns:
            bool: True if sound was played, False otherwise
        """
        if not self.is_initialized or not self.enable_audio:
            return False

        if effect_name not in self.sound_effects:
            self.logger.warning(
                "sound_effect_not_found",
                effect=effect_name
            )
            return False

        try:
            effect = self.sound_effects[effect_name]
            # Apply volume
            scaled_volume = effect.volume * self.sfx_volume * self.master_volume
            # Ensure volume is in valid range
            scaled_volume = max(0.0, min(1.0, scaled_volume))

            # Play on SFX channel
            if self.sfx_channel.get_busy():
                # If channel is busy, try to find another channel or interrupt
                # For simplicity, we'll just play it anyway (will interrupt current sound)
                pass

            self.sfx_channel.play(effect.sound)
            self.sfx_channel.set_volume(scaled_volume)

            self.logger.debug(
                "sound_effect_played",
                effect=effect_name,
                volume=scaled_volume
            )
            return True

        except Exception as e:
            self.logger.error(
                "sound_effect_playback_failed",
                effect=effect_name,
                error=str(e)
            )
            return False

    def play_music(self, music_name: str, loop: bool = True) -> bool:
        """
        Play background music.

        Args:
            music_name: Name of the music track to play
            loop: Whether to loop the music

        Returns:
            bool: True if music started playing, False otherwise
        """
        if not self.is_initialized or not self.enable_audio:
            return False

        # In a real implementation, we would load and play actual music files
        # For now, we'll just log that music would play
        self.logger.info(
            "music_playback_placeholder",
            music=music_name,
            loop=loop
        )

        # For testing, we could generate a simple background tone
        # But music is typically more complex than simple beeps
        # For now, we'll just mark what music should be playing
        self.current_music = music_name if loop else None
        self.music_paused = False

        return True

    def pause_music(self) -> None:
        """Pause background music."""
        if self.music_channel and self.music_channel.get_busy():
            self.music_channel.pause()
            self.music_paused = True
            self.logger.debug("music_paused")

    def resume_music(self) -> None:
        """Resume background music."""
        if self.music_channel and self.music_paused:
            self.music_channel.unpause()
            self.music_paused = False
            self.logger.debug("music_resumed")

    def stop_music(self) -> None:
        """Stop background music."""
        if self.music_channel:
            self.music_channel.stop()
            self.music_paused = False
            self.current_music = None
            self.logger.debug("music_stopped")

    def set_master_volume(self, volume: float) -> None:
        """
        Set master volume (0.0 to 1.0).

        Args:
            volume: Volume level
        """
        self.master_volume = max(0.0, min(1.0, volume))
        self.logger.debug("master_volume_set", volume=self.master_volume)

    def set_sfx_volume(self, volume: float) -> None:
        """
        Set sound effects volume (0.0 to 1.0).

        Args:
            volume: Volume level
        """
        self.sfx_volume = max(0.0, min(1.0, volume))
        self.logger.debug("sfx_volume_set", volume=self.sfx_volume)

    def set_music_volume(self, volume: float) -> None:
        """
        Set music volume (0.0 to 1.0).

        Args:
            volume: Volume level
        """
        self.music_volume = max(0.0, min(1.0, volume))
        self.logger.debug("music_volume_set", volume=self.music_volume)

    def toggle_audio(self) -> None:
        """Toggle audio on/off."""
        self.enable_audio = not self.enable_audio
        if not self.enable_audio:
            self.stop_music()
            # Stop any currently playing SFX
            if self.sfx_channel:
                self.sfx_channel.stop()
        self.logger.info("audio_toggled", enabled=self.enable_audio)

    def get_status(self) -> dict:
        """
        Get current audio status.

        Returns:
            dict: Status information
        """
        return {
            "initialized": self.is_initialized,
            "enabled": self.enable_audio,
            "master_volume": self.master_volume,
            "sfx_volume": self.sfx_volume,
            "music_volume": self.music_volume,
            "current_music": self.current_music,
            "music_paused": self.music_paused,
            "sfx_channel_busy": self.sfx_channel.get_busy() if self.sfx_channel else False,
            "music_channel_busy": self.music_channel.get_busy() if self.music_channel else False,
            "sound_effects_loaded": len(self.sound_effects)
        }

    def update(self, delta_time: float) -> None:
        """
        Update audio system.

        Args:
            delta_time: Time since last frame in seconds
        """
        # In a more sophisticated implementation, we might handle
        # streaming music, audio effects that change over time, etc.
        # For now, most audio is event-triggered, so we don't need
        # to do much in the update loop
        pass

    def cleanup(self) -> None:
        """Clean up audio manager resources."""
        self.logger.info("audio_manager_cleaning_up")
        if self.is_initialized:
            self.stop_music()
            if self.sfx_channel:
                self.sfx_channel.stop()
            if self.music_channel:
                self.music_channel.stop()
            mixer.quit()
            self.is_initialized = False