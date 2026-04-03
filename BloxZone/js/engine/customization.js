const SHOP_ITEMS = {
    bodyColors: [
        { id: 'yellow', name: 'Classic Yellow', color: '#f4d35e', price: 0 },
        { id: 'red', name: 'Brick Red', color: '#e63946', price: 40 },
        { id: 'blue', name: 'Sky Blue', color: '#4ea8de', price: 40 },
        { id: 'green', name: 'Lime Green', color: '#7cb518', price: 40 }
    ],
    shirts: [
        { id: 'none', name: 'No Shirt', color: '#111111', price: 0 },
        { id: 'orange', name: 'Orange Shirt', color: '#ff8c42', price: 60 },
        { id: 'navy', name: 'Navy Shirt', color: '#1d3557', price: 60 },
        { id: 'mint', name: 'Mint Shirt', color: '#2a9d8f', price: 75 }
    ],
    hats: [
        { id: 'none', name: 'No Hat', color: '#111111', price: 0 },
        { id: 'cap-red', name: 'Red Cap', color: '#d90429', price: 110 },
        { id: 'cap-black', name: 'Black Cap', color: '#2b2d42', price: 110 },
        { id: 'crown', name: 'Simple Crown', color: '#f9c74f', price: 160 }
    ]
};

function defaultState() {
    return {
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
}

export function getShopCatalog() {
    return SHOP_ITEMS;
}

export function getAvatarState(userId) {
    const all = JSON.parse(localStorage.getItem('avatarStateByUser') || '{}');
    if (!all[userId]) {
        all[userId] = defaultState();
        localStorage.setItem('avatarStateByUser', JSON.stringify(all));
    }
    return all[userId];
}

export function saveAvatarState(userId, state) {
    const all = JSON.parse(localStorage.getItem('avatarStateByUser') || '{}');
    all[userId] = state;
    localStorage.setItem('avatarStateByUser', JSON.stringify(all));
}

export function buyItem(userId, category, itemId) {
    const state = getAvatarState(userId);
    const item = SHOP_ITEMS[category].find((entry) => entry.id === itemId);

    if (!item) {
        return { success: false, message: 'Item does not exist.' };
    }

    if (state.owned[category].includes(itemId)) {
        return { success: false, message: 'You already own this item.' };
    }

    if (state.coins < item.price) {
        return { success: false, message: 'Not enough coins.' };
    }

    state.coins -= item.price;
    state.owned[category].push(itemId);
    saveAvatarState(userId, state);

    return { success: true, message: 'Purchased!' };
}

export function equipItem(userId, category, itemId) {
    const state = getAvatarState(userId);
    if (!state.owned[category].includes(itemId)) {
        return { success: false, message: 'Buy this item first.' };
    }

    if (category === 'bodyColors') state.equipped.bodyColor = itemId;
    if (category === 'shirts') state.equipped.shirt = itemId;
    if (category === 'hats') state.equipped.hat = itemId;

    saveAvatarState(userId, state);
    return { success: true, message: 'Equipped!' };
}

export function addCoins(userId, amount) {
    const state = getAvatarState(userId);
    state.coins += amount;
    saveAvatarState(userId, state);
}

export function getAvatarRenderData(userId) {
    const state = getAvatarState(userId);

    const body = SHOP_ITEMS.bodyColors.find((i) => i.id === state.equipped.bodyColor) || SHOP_ITEMS.bodyColors[0];
    const shirt = SHOP_ITEMS.shirts.find((i) => i.id === state.equipped.shirt) || SHOP_ITEMS.shirts[0];
    const hat = SHOP_ITEMS.hats.find((i) => i.id === state.equipped.hat) || SHOP_ITEMS.hats[0];

    return {
        bodyColor: body.color,
        shirtColor: shirt.id === 'none' ? null : shirt.color,
        hatColor: hat.id === 'none' ? null : hat.color,
        hatType: hat.id
    };
}
