# ArChess third-party assets

## A Beautiful Game — Khronos glTF Sample Assets

ArChess can lazily load the chess-piece geometry from the KhronosGroup `glTF-Sample-Assets` repository, model `ABeautifulGame`.

Source: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/ABeautifulGame
Asset: `ABeautifulGame.glb`
License: CC BY 4.0 International
Credits: Academy Software Foundation / MaterialX Project for the original model; Ed Mackey for the glTF conversion.

The asset is loaded lazily from a public CDN so the game can start without waiting for the model download. If the asset cannot be fetched, ArChess retains its procedural 3D pieces instead of falling back to Unicode/fake 3D pieces.
