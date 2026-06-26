let splashActivated = false;

function createSplash() {
    const logo = new URL("../../BurtLogo.jpg", import.meta.url);

    const splashBody = document.createElement('div');
    splashBody.setAttribute('class', 'BurtCore-Splash');
    splashBody.style.position = 'fixed';
    splashBody.style.top = '0';
    splashBody.style.left = '0';
    splashBody.style.width = '100%';
    splashBody.style.height = '100vh';
    splashBody.style.backgroundColor = 'black';
    splashBody.style.zIndex = '99999';
    //splashBody.style.display = 'flex';

    const splashImg = document.createElement('img');
    splashImg.src = logo.href;
    splashImg.style.transform = 'translate(-50%, 0)';
    splashImg.style.left = '50%';
    splashImg.style.position = 'absolute';
    splashImg.style.width = '20%';
    splashImg.style.top = '10%';
    splashImg.style.marginBottom = '10%';

    const splashText = document.createElement('h2');
    splashText.innerHTML = 'Powered by BurtCore Engine.';
    splashText.style.position = 'absolute';
    splashText.style.transform = 'translate(-50%, 0)';
    splashText.style.left = '50%';
    splashText.style.top = '60%';
    splashText.style.color = 'white';
    splashText.style.fontWeight = 'bolder';
    splashText.style.fontSize = '40px';

    splashBody.append(splashImg);
    splashBody.append(splashText);
    document.body.append(splashBody);

    return splashBody;
}

function fadeSplash(splashBody, duration = 500) {
    let start = null;

    function animate(timestamp) {
        if (!start) start = timestamp;

        const progress = timestamp - start;
        const opacity = Math.max(1 - progress / duration, 0);

        splashBody.style.opacity = opacity;

        if (progress < duration) requestAnimationFrame(animate);
        else document.body.removeChild(splashBody);
    }

    requestAnimationFrame(animate);
}

export function runSplash(time) {
    if (splashActivated) return;

    const splashBody = createSplash();

    setTimeout(() => {
        fadeSplash(splashBody, 500);
        splashActivated = true;
    }, time);
}

// Check for user input //
export let hasInteracted = false;

const waitUserInteract = (() => {
    let promise;

    return function () {
        if (!promise) {
            promise = new Promise(resolve => {
                const events = ["pointerdown", "keydown", "touchstart"];

                const handler = () => {
                    events.forEach(event =>
                        document.removeEventListener(event, handler)
                    );
                    resolve();
                };

                events.forEach(event =>
                    document.addEventListener(event, handler, { once: true })
                );
            });
        }

        return promise;
    };
})();

await waitUserInteract();

hasInteracted = true;
