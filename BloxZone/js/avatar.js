// Backward-compatible avatar helpers. The detailed shop logic lives in js/engine/customization.js.

function getAvatarState(userId) {
    const all = JSON.parse(localStorage.getItem('avatarStateByUser') || '{}');
    if (!all[userId]) {
        all[userId] = {
            coins: 300,
            owned: {
                bodyColors: ['yellow'],
                shirts: ['none'],
                hats: ['none']
            },
            equipped: {
                bodyColor: 'yellow',
                shirt: 'none',
                hat: 'none'
            }
        };
        localStorage.setItem('avatarStateByUser', JSON.stringify(all));
    }
    return all[userId];
}

function setAvatarState(userId, state) {
    const all = JSON.parse(localStorage.getItem('avatarStateByUser') || '{}');
    all[userId] = state;
    localStorage.setItem('avatarStateByUser', JSON.stringify(all));
}

function setAvatar(userId, avatarType) {
    // Legacy mapping to new body color setting.
    const map = {
        default: 'yellow',
        robot: 'blue',
        knight: 'red',
        wizard: 'green',
        ninja: 'blue',
        pirate: 'red'
    };

    const state = getAvatarState(userId);
    const body = map[avatarType] || 'yellow';

    if (!state.owned.bodyColors.includes(body)) {
        state.owned.bodyColors.push(body);
    }

    state.equipped.bodyColor = body;
    setAvatarState(userId, state);
}

function getAvatar(userId) {
    const state = getAvatarState(userId);
    const hatLabel = state.equipped.hat === 'none' ? 'NoHat' : state.equipped.hat;
    const shirtLabel = state.equipped.shirt === 'none' ? 'NoShirt' : state.equipped.shirt;
    return `${state.equipped.bodyColor}/${shirtLabel}/${hatLabel}`;
}

function getAvatarIcon(userId) {
    const state = getAvatarState(userId);
    if (state.equipped.hat === 'crown') return '👑';
    if (state.equipped.hat === 'cap-red' || state.equipped.hat === 'cap-black') return '🧢';
    return '🧱';
}

function getAllAvatars() {
    return ['yellow', 'red', 'blue', 'green'];
}
