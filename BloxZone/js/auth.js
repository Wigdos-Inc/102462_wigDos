// Authentication system using localStorage
// Simple client-side auth (not secure for production!)

function register(username, password) {
    // Get all users
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if username exists
    if (users.find(u => u.username === username)) {
        return { success: false, message: 'Username already exists' };
    }
    
    // Create new user
    const newUser = {
        id: Date.now().toString(),
        username: username,
        password: password, // In production, never store plain passwords!
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    // Auto login
    localStorage.setItem('currentUser', JSON.stringify({
        id: newUser.id,
        username: newUser.username
    }));
    
    return { success: true, user: newUser };
}

function login(username, password) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify({
            id: user.id,
            username: user.username
        }));
        return true;
    }
    
    return false;
}

function logout() {
    localStorage.removeItem('currentUser');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}
