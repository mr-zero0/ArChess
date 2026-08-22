import secrets
import string
from extensions import db
from game.models import Room, User

def create_room(guest_id):
    # Ensure user exists
    user = User.query.filter_by(guest_id=guest_id).first()
    if not user:
        user = User(guest_id=guest_id)
        db.session.add(user)
    
    room_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    while Room.query.filter_by(room_code=room_code).first():
        room_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    
    room = Room(room_code=room_code)
    user.room = room
    db.session.add(room)
    db.session.commit()
    
    return room.to_dict()