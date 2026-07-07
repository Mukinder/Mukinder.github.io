document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('boids-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;

    const boids = [];
    const numBoids = window.innerWidth < 768 ? 50 : 120;

    // Mouse interaction (Predator)
    const mouse = {
        x: null,
        y: null,
        radius: 150 // Predator scatter radius
    };

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    class Boid {
        constructor() {
            this.position = {
                x: Math.random() * width,
                y: Math.random() * height
            };
            this.velocity = {
                x: (Math.random() - 0.5) * 4,
                y: (Math.random() - 0.5) * 4
            };
            this.acceleration = { x: 0, y: 0 };
            this.maxForce = 0.05;
            this.maxSpeed = 3;
            // Aesthetic properties
            this.size = Math.random() * 2 + 2;
            const colors = ['rgba(56, 189, 248, 0.6)', 'rgba(129, 140, 248, 0.6)', 'rgba(255, 255, 255, 0.4)'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
            this.velocity.x += this.acceleration.x;
            this.velocity.y += this.acceleration.y;

            // Limit speed
            const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
            if (speed > this.maxSpeed) {
                this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
                this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
            }

            // Reset acceleration
            this.acceleration.x = 0;
            this.acceleration.y = 0;

            this.edges();
        }

        applyForce(forceX, forceY) {
            this.acceleration.x += forceX;
            this.acceleration.y += forceY;
        }

        edges() {
            if (this.position.x > width + 50) this.position.x = -50;
            if (this.position.x < -50) this.position.x = width + 50;
            if (this.position.y > height + 50) this.position.y = -50;
            if (this.position.y < -50) this.position.y = height + 50;
        }

        draw() {
            const angle = Math.atan2(this.velocity.y, this.velocity.x);

            ctx.save();
            ctx.translate(this.position.x, this.position.y);
            ctx.rotate(angle);

            // Draw a boid (triangle)
            ctx.beginPath();
            ctx.moveTo(this.size * 2, 0);
            ctx.lineTo(-this.size, this.size);
            ctx.lineTo(-this.size, -this.size);
            ctx.closePath();

            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.restore();
        }

        flock(boids) {
            let alignmentX = 0, alignmentY = 0;
            let cohesionX = 0, cohesionY = 0;
            let separationX = 0, separationY = 0;
            let total = 0;
            const perceptionRadius = 60;

            for (let other of boids) {
                const d = Math.hypot(this.position.x - other.position.x, this.position.y - other.position.y);
                if (other !== this && d < perceptionRadius) {
                    alignmentX += other.velocity.x;
                    alignmentY += other.velocity.y;

                    cohesionX += other.position.x;
                    cohesionY += other.position.y;

                    let diffX = this.position.x - other.position.x;
                    let diffY = this.position.y - other.position.y;
                    diffX /= (d * d); // Weight by distance
                    diffY /= (d * d);
                    separationX += diffX;
                    separationY += diffY;

                    total++;
                }
            }

            if (total > 0) {
                // Alignment
                alignmentX /= total;
                alignmentY /= total;
                const alignSpeed = Math.hypot(alignmentX, alignmentY);
                if (alignSpeed > 0) {
                    alignmentX = (alignmentX / alignSpeed) * this.maxSpeed;
                    alignmentY = (alignmentY / alignSpeed) * this.maxSpeed;
                }

                let steerAlignX = alignmentX - this.velocity.x;
                let steerAlignY = alignmentY - this.velocity.y;

                // Cohesion
                cohesionX /= total;
                cohesionY /= total;
                let vecCohX = cohesionX - this.position.x;
                let vecCohY = cohesionY - this.position.y;
                const cohSpeed = Math.hypot(vecCohX, vecCohY);
                if (cohSpeed > 0) {
                    vecCohX = (vecCohX / cohSpeed) * this.maxSpeed;
                    vecCohY = (vecCohY / cohSpeed) * this.maxSpeed;
                }
                let steerCohX = vecCohX - this.velocity.x;
                let steerCohY = vecCohY - this.velocity.y;

                // Separation
                separationX /= total;
                separationY /= total;
                const sepSpeed = Math.hypot(separationX, separationY);
                if (sepSpeed > 0) {
                    separationX = (separationX / sepSpeed) * this.maxSpeed;
                    separationY = (separationY / sepSpeed) * this.maxSpeed;
                }
                let steerSepX = separationX - this.velocity.x;
                let steerSepY = separationY - this.velocity.y;

                // Weights
                this.applyForce(steerAlignX * 1.0, steerAlignY * 1.0);
                this.applyForce(steerCohX * 1.0, steerCohY * 1.0);
                this.applyForce(steerSepX * 1.5, steerSepY * 1.5);
            }

            // MOUSE ATTRACTION (Swarm around the cursor pointer)
            if (mouse.x !== null && mouse.y !== null) {
                const distToMouse = Math.hypot(this.position.x - mouse.x, this.position.y - mouse.y);
                // Mouse pull radius
                if (distToMouse < 400) {
                    let attractX = mouse.x - this.position.x;
                    let attractY = mouse.y - this.position.y;

                    const attractSpeed = Math.hypot(attractX, attractY);
                    if (attractSpeed > 0) {
                        attractX = (attractX / attractSpeed) * this.maxSpeed;
                        attractY = (attractY / attractSpeed) * this.maxSpeed;
                    }

                    let steerAttractX = attractX - this.velocity.x;
                    let steerAttractY = attractY - this.velocity.y;

                    // Apply a gentle pull towards the mouse pointer
                    this.applyForce(steerAttractX * 0.4, steerAttractY * 0.4);
                }
            }
        }
    }

    for (let i = 0; i < numBoids; i++) {
        boids.push(new Boid());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        for (let boid of boids) {
            boid.flock(boids);
            boid.update();
            boid.draw();
        }

        requestAnimationFrame(animate);
    }

    animate();
});
