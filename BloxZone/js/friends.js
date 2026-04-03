// Friends system using localStorage

function sendFriendRequest(userId, friendUsername) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const friend = users.find(u => u.username === friendUsername);
    
    if (!friend) {
        return { success: false, message: 'User not found' };
    }
    
    if (friend.id === userId) {
        return { success: false, message: 'Cannot add yourself as friend' };
    }
    
    // Get friend requests
    let friendRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
    
    // Check if request already exists
    if (friendRequests.find(r => r.from === userId && r.to === friend.id)) {
        return { success: false, message: 'Friend request already sent' };
    }
    
    // Check if already friends
    const friends = JSON.parse(localStorage.getItem('friends') || '[]');
    if (friends.find(f => 
        (f.user1 === userId && f.user2 === friend.id) || 
        (f.user2 === userId && f.user1 === friend.id)
    )) {
        return { success: false, message: 'Already friends' };
    }
    
    friendRequests.push({
        id: Date.now().toString(),
        from: userId,
        to: friend.id,
        createdAt: new Date().toISOString()
    });
    
    localStorage.setItem('friendRequests', JSON.stringify(friendRequests));
    return { success: true, message: 'Friend request sent!' };
}

function getFriendRequests(userId) {
    const friendRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    const myRequests = friendRequests.filter(r => r.to === userId);
    
    return myRequests.map(request => {
        const user = users.find(u => u.id === request.from);
        return {
            id: request.from,
            username: user ? user.username : 'Unknown',
            requestId: request.id
        };
    });
}

function acceptFriendRequest(userId, friendId) {
    // Remove friend request
    let friendRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
    friendRequests = friendRequests.filter(r => 
        !(r.from === friendId && r.to === userId)
    );
    localStorage.setItem('friendRequests', JSON.stringify(friendRequests));
    
    // Add to friends list
    const friends = JSON.parse(localStorage.getItem('friends') || '[]');
    friends.push({
        id: Date.now().toString(),
        user1: userId,
        user2: friendId,
        createdAt: new Date().toISOString()
    });
    localStorage.setItem('friends', JSON.stringify(friends));
}

function rejectFriendRequest(userId, friendId) {
    let friendRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
    friendRequests = friendRequests.filter(r => 
        !(r.from === friendId && r.to === userId)
    );
    localStorage.setItem('friendRequests', JSON.stringify(friendRequests));
}

function getFriends(userId) {
    const friends = JSON.parse(localStorage.getItem('friends') || '[]');
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    const myFriends = friends.filter(f => 
        f.user1 === userId || f.user2 === userId
    );
    
    return myFriends.map(friendship => {
        const friendId = friendship.user1 === userId ? friendship.user2 : friendship.user1;
        const user = users.find(u => u.id === friendId);
        
        // Get avatar state and derive a tiny icon.
        const avatarStates = JSON.parse(localStorage.getItem('avatarStateByUser') || '{}');
        const avatarState = avatarStates[friendId];
        let avatar = '🧱';
        if (avatarState && avatarState.equipped) {
            if (avatarState.equipped.hat === 'crown') avatar = '👑';
            if (avatarState.equipped.hat === 'cap-red' || avatarState.equipped.hat === 'cap-black') avatar = '🧢';
        }
        
        return {
            id: friendId,
            username: user ? user.username : 'Unknown',
            avatar: avatar
        };
    });
}

function removeFriend(userId, friendId) {
    let friends = JSON.parse(localStorage.getItem('friends') || '[]');
    friends = friends.filter(f => 
        !((f.user1 === userId && f.user2 === friendId) || 
          (f.user2 === userId && f.user1 === friendId))
    );
    localStorage.setItem('friends', JSON.stringify(friends));
}
