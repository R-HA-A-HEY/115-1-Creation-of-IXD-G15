import { BlackHole, Boundary, PaperBall, Choice, DEPTH_Y } from './obj.js?v=20261122a';
export let score = 0;
let combo = 0;
const CONTROL_MODE = "straight";

const GRAVITY = 0;
const FRICTION = 0.85;
const SENSITIVITY = 0.8;
const BALLWIDTH = 70;
const BALLHEIGHT = 70;
// const HOLEWIDTH = 90;
// const HOLEHEIGHT = 90;
// const HOLE_XS = [0.8, 0.2, 0.5]; 
// const HOLE_Z = 100;
const Z_TOLERANCE = 5;
const MAX_FLIGHT_MS = 3000;
const MAX_SPEED = 10; 
const CHOICE_XS = [0.8, 0.2, 0.5];
const CHOICE_Z = 100;
const JUDGE_Z = CHOICE_Z - Z_TOLERANCE * 6;
const HIT_SCALE = 1; 

const SETTLE_MS = 600;
const SETTLE_DAMPING = 0.85;
const STRAIGHT_FRAMES = 32;  
let settling = false;
let settleStart = 0;

let started = false;
let rafId = 0;

const SCROLL_SPEED = 130;
let scrollX = 0;
let lastFrame = 0;
let activeChoice = null;


const PAPERBALL = new Image();
// const BLACKHOLE = new Image();
PAPERBALL.src = "sujie/紙球.png";
// BLACKHOLE.src = "Images/BlackHole.png";

const CHOICEWIDTH = 100;
const CHOICEHEIGHT = 100;
const CHOICE = [
    new Choice(0, 0, CHOICEWIDTH, CHOICEHEIGHT, "./Images/Face.png", true),
    new Choice(0, 0, CHOICEWIDTH, CHOICEHEIGHT, "./Images/Cat.png", false),
    new Choice(0, 0, CHOICEWIDTH, CHOICEHEIGHT, "./Images/Dog.png", false),
];
const IMAGES = CHOICE.map(item => {
    const img = new Image();
    img.src = item.src;
    return img;
});

CHOICE.forEach((item, index) => {
    item.image = IMAGES[index];
});

let choice = null;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = 360;
const HEIGHT = 600;
let w = canvas.width, h = canvas.height;
let scale = 1;

const screen = new Boundary(0, 0, WIDTH, HEIGHT);
const boundary = new Boundary(0, 0, WIDTH, HEIGHT);
const paperBall = new PaperBall(0, 0, 0, BALLWIDTH, BALLHEIGHT, PAPERBALL);
// const blackHoles = HOLE_XS.map(() =>
//     new BlackHole(0, 0, 0, 100, HOLEWIDTH, HOLEHEIGHT, 0, 0, WIDTH, BLACKHOLE));

let _mouseX = 0;
let _mouseY = 0;

let releasedAt = 0;

function ResetBall() {
    const w = canvas.width, h = canvas.height;
    paperBall.Set(w * 0.5, h * 0.85, 0, BALLWIDTH * scale, BALLHEIGHT * scale);
    paperBall.velocityX = paperBall.velocityY = paperBall.velocityZ = 0;
    paperBall.scaleX = paperBall.scaleY = 1;
    paperBall.isActive = false;
    paperBall.isDragging = false;
    paperBall.straight = false;
}


function Run(seconds){
    let timer = setInterval(function(){
        seconds--;
        if(seconds == 0){
            clearInterval(timer);
            console.log("Time Out");
        }
    }, 1000);
}

export function ResetLayout() {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;

    canvas.width = cw;
    canvas.height = ch;
    w = cw;
    h = ch;

    scale = Math.min(w / WIDTH, h / HEIGHT);
    screen.Set(0, 0, w, h);
    boundary.Set(0, h * 0.7, w, h);

    if (!paperBall.isActive && !paperBall.isDragging) ResetBall();

    // blackHoles.forEach((b, i) =>
    //     b.Set(i, w * HOLE_XS[i], h * 0.5, 100,
    //           HOLEWIDTH * scale, HOLEHEIGHT * scale,
    //           0, w * 0.1, w * 0.9));

    if (choice) { 
        PlaceChoices(choice); 
        ScrollChoices(choice, 0); 
    }
}

function pos(e) {
    const r = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - r.left) * canvas.width / r.width,
        y: (e.clientY - r.top) * canvas.height / r.height
    };
}

export function Setup() {
    if (started) { Restart(); return; }
    started = true;
    new ResizeObserver(ResetLayout).observe(canvas);

    if (CONTROL_MODE === "drag") BindDragControls();
    else BindStraightControls();

    Restart();
}

function Restart() {
    score = 0;
    combo = 0;
    settling = false;
    releasedAt = 0;
    paperBall.isActive = false;
    paperBall.isDragging = false;
    lastFrame = 0;
    ResetLayout();
    choice = GetChoice();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(Update);
}

function Update() {
    paperBall.Update(GRAVITY, FRICTION, screen);
    
    const now = performance.now();
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
    lastFrame = now;

    const flying = paperBall.isActive && !paperBall.isDragging;
    let hit = null;

    ScrollChoices(choice, settling ? 0 : dt);   // 選中後暫停捲動，讓被選中的那張留在原地
    if (flying && !settling && activeChoice &&
        paperBall.z >= JUDGE_Z && activeChoice.Contains(paperBall, HIT_SCALE)) {
        hit = activeChoice;
    }
    if (settling) {
        paperBall.velocityX *= SETTLE_DAMPING;
        paperBall.velocityY *= SETTLE_DAMPING;
        paperBall.velocityZ *= SETTLE_DAMPING;

        const t = Math.min((now - settleStart) / SETTLE_MS, 1);
        paperBall.scaleX = paperBall.scaleY = 1 - t * 0.5;

        if (t >= 1) {
            settling = false;
            ResetBall();
            choice = GetChoice();
        }
    } else if (flying) {
        const reachedBack = paperBall.z >= CHOICE_Z - Z_TOLERANCE;
        const timeout = now - releasedAt > MAX_FLIGHT_MS;

        if (hit) {
            if (hit.isValid) {
                combo++;
                score += 100 * (1 + combo * 0.1);
            } else {
                combo = 0;
                score -= 100
            }
            settling = true;
            settleStart = now;
        } else if (reachedBack || paperBall.IsSettled() || timeout) {
            console.log("miss", {
                reachedBack, settled: paperBall.IsSettled(), timeout,
                ballY: paperBall.y, ballZ: paperBall.z, choiceY: choice[0].y
            });
            combo = 0;
            ResetBall();
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    choice.forEach(c => c.Draw(ctx));
    // blackHoles.forEach(h => h.Draw(ctx));
    paperBall.Draw(ctx);
    rafId = requestAnimationFrame(Update);
}
export function getResult(selectedId) {
    if(selectedId == answerId) {
        rounds++;
        return true;
    }
    else {
        return false;
    }
}

function GetChoice() {
    const shuffled = [...CHOICE].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, 3);

    if (!picked.some(c => c.isValid)) {
        const valid = CHOICE.find(c => c.isValid);
        if (valid) {
            picked[getRandomInt(picked.length)] = valid;
        } else {
            console.error("圖片庫中完全沒有正確答案");
        }
    }

    const result = picked.map(c => {
        const n = new Choice(0, 0, CHOICEWIDTH, CHOICEHEIGHT, c.src, c.isValid);
        n.image = c.image;
        return n;
    });

    PlaceChoices(result);
    ScrollChoices(result, 0);
    return result;
}

function PlaceChoices(list) {
    const floorY = h - CHOICE_Z * DEPTH_Y - (BALLHEIGHT * scale) / 2;
    list.forEach((c, i) =>
        c.Set(i, c.x, floorY, CHOICE_Z,
              CHOICEWIDTH * scale, CHOICEHEIGHT * scale,
              0, 0, w));
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function ScrollChoices(list, dt) {
    if (!list || !list.length) return;
    const itemW = CHOICEWIDTH * scale;
    const spacing = Math.max(itemW * 1.5, (w + itemW * 2) / list.length);
    const loop = spacing * list.length;
    scrollX = (scrollX + SCROLL_SPEED * Math.min(Math.max(1, 1 + combo / 10), 2) * scale * dt) % loop;
    console.log(SCROLL_SPEED * Math.min(Math.max(1, 1 + combo * 3 / 10), 5));
    let best = null, bestDist = Infinity;
    list.forEach((c, i) => {
        let off = (i * spacing - scrollX) % loop;
        if (off < -loop / 2) off += loop;
        else if (off >= loop / 2) off -= loop;
        c.x = w / 2 + off;
        c.active = false;
        if (Math.abs(off) < bestDist) { bestDist = Math.abs(off); best = c; }
    });
    if (best) best.active = true;
    activeChoice = best;
}

function LaunchStraight(tx) {
    const floorY = h - CHOICE_Z * DEPTH_Y - (BALLHEIGHT * scale) / 2;
    const half = paperBall.width / 2;
    tx = Math.min(Math.max(tx, half), w - half);

    paperBall.isActive = true;
    paperBall.isDragging = false;
    paperBall.straight = true;
    paperBall.z = 0;
    paperBall.scaleX = paperBall.scaleY = 1;
    paperBall.velocityX = (tx - paperBall.x) / STRAIGHT_FRAMES;
    paperBall.velocityY = (floorY - paperBall.y) / STRAIGHT_FRAMES;   // 終點固定在選項那一排
    paperBall.velocityZ = CHOICE_Z / STRAIGHT_FRAMES;
    releasedAt = performance.now();
}

function BindStraightControls() {
    canvas.addEventListener('pointerdown', (e) => {
        if (settling || paperBall.isActive) return;
        LaunchStraight(pos(e).x);
    });
}

function BindDragControls() {
    canvas.addEventListener('pointerdown', (e) => {
        if (settling) return;
        const p = pos(e);
        if (paperBall.isPointInside(p.x, p.y)) {
            canvas.setPointerCapture(e.pointerId);
            paperBall.straight = false;
            paperBall.isActive = true;
            paperBall.isDragging = true;
            paperBall.velocityX = paperBall.velocityY = paperBall.velocityZ = 0;
            paperBall.z = 0;
            paperBall.scaleX = paperBall.scaleY = 1;
            _mouseX = p.x;
            _mouseY = p.y;
        }
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!paperBall.isDragging) return;
        const p = pos(e);
        paperBall.velocityX = (p.x - _mouseX) * SENSITIVITY;
        paperBall.velocityY = (p.y - _mouseY) * SENSITIVITY;

        const sp = Math.hypot(paperBall.velocityX, paperBall.velocityY);
        if (sp > MAX_SPEED) {
            paperBall.velocityX *= MAX_SPEED / sp;
            paperBall.velocityY *= MAX_SPEED / sp;
        }
        paperBall.x = p.x;
        paperBall.y = p.y;
        _mouseX = p.x;
        _mouseY = p.y;
        paperBall.ConstrainToBoundary(boundary);
    });

    canvas.addEventListener('pointercancel', () => {
        paperBall.isDragging = false;
        paperBall.velocityX = paperBall.velocityY = paperBall.velocityZ = 0;
        ResetBall();
    });

    canvas.addEventListener('pointerup', () => {
        if (paperBall.isDragging) {
            releasedAt = performance.now();
            const speed = Math.hypot(paperBall.velocityX, paperBall.velocityY);
            if (speed > 0.5 && paperBall.velocityY < 0) {
                paperBall.velocityZ = Math.min(3 + speed * 0.3, 5);
            }
        }
        paperBall.isDragging = false;
    });
}
