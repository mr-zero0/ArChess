import secrets
import string


ROOMS = {}
ROOM_CODE_ALPHABET = string.ascii_uppercase + string.digits


def create_room(guest_id):
    room_id = "".join(secrets.choice(ROOM_CODE_ALPHABET) for _ in range(6))
    while room_id in ROOMS:
        room_id = "".join(secrets.choice(ROOM_CODE_ALPHABET) for _ in range(6))
    room = {
        "roomId": room_id,
        "status": "waiting",
        "players": [{"guestId": guest_id, "team": "white"}],
    }
    ROOMS[room_id] = room
    return room.copy()
