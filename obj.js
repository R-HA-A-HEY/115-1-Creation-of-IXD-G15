export const MAX_Z = 100;
export const DEPTH_Y = 2.6;
export function DepthScale(z){
    return 1 - (z / MAX_Z) * 0.3;
}
export class Choice {
    constructor(x, y, width, height, src, isValid) {
        this.id = 0;
        this.x = x;
        this.y = y;
        this.z = MAX_Z;
        this.width = width;
        this.height = height;
        this.src = src;
        this.isValid = isValid;
        this.image = null;
        this.speed = 0;
        this.minX = 0;
        this.maxX = 0;
        this.active = false;
    }
    Update() {
        this.x += this.speed;
        if (this.x + this.width / 2 > this.maxX) {
            this.x = this.maxX - this.width / 2;
            this.speed = -this.speed;
        } else if (this.x - this.width / 2 < this.minX) {
            this.x = this.minX + this.width / 2;
            this.speed = -this.speed;
        }
    }
    Contains(ball, hitScale = 1) {
        const bw = ball.width * ball.scaleX;
        const bh = ball.height * ball.scaleY;
        const dx = Math.abs(ball.x - this.x);
        const dy = Math.abs(ball.y - this.y);
        return dx <= (this.width + bw) / 2 * hitScale &&
            dy <= (this.height + bh) / 2 * hitScale;
    }
Draw(ctx) {
    const left = this.x - this.width / 2;
    const top = this.y - this.height / 2;
    ctx.save();
    ctx.globalAlpha = this.active ? 1 : 0.45;
    ctx.drawImage(
        this.image,
        left + this.width * 0.1,
        top + this.height * 0.1,
        this.width * 0.8,
        this.height * 0.8
    );
    ctx.strokeStyle = this.active ? "#ff5a36" : "#41454b";
    ctx.lineWidth = this.active ? 6 : 4;
    ctx.beginPath();
    ctx.roundRect(left, top, this.width, this.height, 16);
    ctx.stroke();
    ctx.restore();
}
    Set(id, x, y, z, width, height, speed, minX, maxX) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.z = z;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.minX = minX;
        this.maxX = maxX;
    }
}
export class Boundary{
    constructor(x1, y1, x2, y2){
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }
    Set(x1, y1, x2, y2){
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }
}
export class PaperBall {
    constructor(x, y, z, width, height, image) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.prevZ = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.width = width;
        this.height = height;
        this.velocityX = 0;
        this.velocityY = 0;
        this.velocityZ = 0;
        this.image = image;
        this.isActive = false;
        this.isDragging = false;
        this.straight = false;
    }
    isPointInside(mouseX, mouseY){
        let dx = Math.abs(mouseX - this.x);
        let dy = Math.abs(mouseY - this.y);
        return dx <= this.width * this.scaleX / 2 && dy <= this.height * this.scaleY / 2;
    }
    ConstrainToBoundary(boundary){
        if (this.isActive && this.isDragging){
            if (this.x + this.width / 2 > boundary.x2){
                this.x = boundary.x2 - this.width / 2;
            } else if (this.x - this.width / 2 < boundary.x1){
                this.x = boundary.x1 + this.width / 2;
            }
            
            if (this.y + this.height / 2 > boundary.y2){
                this.y = boundary.y2 - this.height / 2;
            } else if (this.y - this.height / 2 < boundary.y1){
                this.y = boundary.y1 + this.height / 2;
            }
        }
    }
    Update(gravity, friction, boundary){
        if (!this.isActive || this.isDragging) return;

        this.prevZ = this.z;
        const k = this.straight ? 1 : 0.98;
        this.velocityY *= k;
        this.velocityX *= k;
        this.velocityZ *= k;
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.z += this.velocityZ;

        this.scaleX = 1 * DepthScale(this.z);
        this.scaleY = 1 * DepthScale(this.z);
        if (this.x + this.width / 2 > boundary.x2){
            this.x = boundary.x2 - this.width / 2;
            this.velocityX = -this.velocityX * friction;

        } else if (this.x - this.width / 2 < boundary.x1){
            this.x = boundary.x1 + this.width / 2;
            this.velocityX = -this.velocityX * friction;
        }

        if (this.y + this.height / 2 > boundary.y2 - this.z * DEPTH_Y){
            this.y = boundary.y2 - this.z * DEPTH_Y - this.height / 2;
            // this.velocityY = -this.velocityY * friction;
            // this.velocityX *= 0.81;
            // this.velocityZ *= 0.9;
        }
        if (this.z >= MAX_Z){
            this.z = MAX_Z;
            this.velocityZ = 0;
        }
    }
    IsSettled(){
        return Math.abs(this.velocityX) < 0.1 &&
               Math.abs(this.velocityY) < 0.1 &&
               Math.abs(this.velocityZ) < 0.05;
    }
    Draw(ctx) {
        ctx.drawImage(
            this.image,
            this.x - this.width * this.scaleX / 2,
            this.y - this.height * this.scaleY / 2,
            this.width * this.scaleX,
            this.height * this.scaleY
        );
    }
    Reset(boundary, width, height, scale){
        this.Set((boundary.x1 + boundary.x2) / 2, boundary.y2 - (this.height / 2) * scale, 0, width * scale, height * scale);
        this.velocityX = 0;
        this.velocityY = 0;
        this.velocityZ = 0;
        this.scaleX = DepthScale(this.z);
        this.scaleY = DepthScale(this.z);
        this.isActive = false;
        this.isDragging = false;
    }
    Set(x, y, z, width, height){
        this.x = x;
        this.y = y;
        this.z = z;
        this.prevZ = z;
        this.width = width;
        this.height = height;
    }
}

export class BlackHole {
    constructor(id, x, y, z, width, height, speed, minX, maxX, image) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.z = z;
        this.scaleX = 1;
        this.scaleY = 1;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.minX = minX;
        this.maxX = maxX;
        this.image = image;
        this.isKnockedDown = false;
        
    }
    Update(){
        this.x += this.speed;

        this.scaleX = 1 / Math.max(this.z * 0.01, 1);
        this.scaleY = 1 / Math.max(this.z * 0.02, 1);

        if (this.x + this.width / 2 > this.maxX){
            this.x = this.maxX - this.width / 2;
            this.speed = -this.speed;

        } else if (this.x - this.width / 2 < this.minX){
            this.x = this.minX + this.width / 2;
            this.speed = -this.speed;
        }
    }
    Contains(ball, hitScale = 1){
        const rx = this.width * this.scaleX / 2 * hitScale;
        const ry = this.height * this.scaleY / 2 * hitScale;
        const dx = (ball.x - this.x) / rx;
        const dy = (ball.y - this.y) / ry;
        return dx * dx + dy * dy <= 1;
    }
    Draw(ctx) {
        ctx.drawImage(
            this.image,
            this.x - this.width * this.scaleX / 2,
            this.y - this.height * this.scaleY / 2,
            this.width * this.scaleX,
            this.height * this.scaleY
        );
    }
    Set(id, x, y, z, width, height, speed, minX, maxX){
        this.id = id;
        this.x = x;
        this.y = y;
        this.z = z;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.minX = minX;
        this.maxX = maxX;
    }
}