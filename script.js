document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    const slides = document.querySelectorAll('.slide');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const progressBar = document.getElementById('progressBar');
    const slideIndicator = document.getElementById('slideIndicator');
    let currentSlideIndex = 0;
    
    // Initialisation
    initSlideIndicators();
    updateProgressBar();
    initVectorSpace();
    initDistanceCanvas();
    initIndexVisualization();
    initBenchmarkChart();
    initDemoVisualization();
    initCodeHighlighting();
    
    // Navigation des slides
    prevButton.addEventListener('click', showPreviousSlide);
    nextButton.addEventListener('click', showNextSlide);
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
            showPreviousSlide();
        } else if (e.key === 'ArrowRight') {
            showNextSlide();
        }
    });
    
    // Initialisation des indicateurs de slide
    function initSlideIndicators() {
        for (let i = 0; i < slides.length; i++) {
            const dot = document.createElement('div');
            dot.classList.add('indicator-dot');
            if (i === 0) {
                dot.classList.add('active');
            }
            dot.addEventListener('click', function() {
                goToSlide(i);
            });
            slideIndicator.appendChild(dot);
        }
    }
    
    // Mise à jour de la barre de progression
    function updateProgressBar() {
        const progress = ((currentSlideIndex + 1) / slides.length) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    // Navigation vers la slide précédente
    function showPreviousSlide() {
        if (currentSlideIndex > 0) {
            goToSlide(currentSlideIndex - 1);
        }
    }
    
    // Navigation vers la slide suivante
    function showNextSlide() {
        if (currentSlideIndex < slides.length - 1) {
            goToSlide(currentSlideIndex + 1);
        }
    }
    
    // Navigation vers une slide spécifique
    function goToSlide(index) {
        // Masquer la slide actuelle
        slides[currentSlideIndex].classList.remove('slide-visible');
        slides[currentSlideIndex].classList.add(index > currentSlideIndex ? 'slide-previous' : 'slide-hidden');
        
        // Mettre à jour l'indicateur
        slideIndicator.children[currentSlideIndex].classList.remove('active');
        
        // Afficher la nouvelle slide
        currentSlideIndex = index;
        slides[currentSlideIndex].classList.remove('slide-previous', 'slide-hidden');
        slides[currentSlideIndex].classList.add('slide-visible');
        
        // Mettre à jour l'indicateur et la barre de progression
        slideIndicator.children[currentSlideIndex].classList.add('active');
        updateProgressBar();
        
        // Animer les éléments de la slide actuelle
        animateCurrentSlideElements();
    }
    
    // Animation des éléments de la slide actuelle
    function animateCurrentSlideElements() {
        // Réinitialiser les animations des étapes d'algorithme
        const algorithmSteps = slides[currentSlideIndex].querySelectorAll('.algorithm-step');
        algorithmSteps.forEach((step, index) => {
            step.style.opacity = 0;
            step.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                step.style.opacity = 1;
                step.style.transform = 'translateY(0)';
            }, 500 + index * 300);
        });
        
        // Animer les barres de benchmark
        const benchmarkBars = slides[currentSlideIndex].querySelectorAll('.benchmark-bar');
        benchmarkBars.forEach((bar, index) => {
            setTimeout(() => {
                bar.style.width = bar.getAttribute('data-width') || bar.style.width;
            }, 500 + index * 200);
        });
    }
    
    // Initialisation de l'espace vectoriel 3D
    function initVectorSpace() {
        const vectorSpace = document.getElementById('vectorSpace');
        if (!vectorSpace) return;
        
        // Création de points vectoriels aléatoires
        for (let i = 0; i < 20; i++) {
            const point = document.createElement('div');
            point.classList.add('vector-point');
            
            // Position aléatoire dans l'espace 3D
            const x = 10 + Math.random() * 80;
            const y = 10 + Math.random() * 80;
            const z = Math.random() * 0.5 + 0.5; // Effet de profondeur
            
            point.style.left = `${x}%`;
            point.style.bottom = `${y}%`;
            point.style.transform = `translate(-50%, 50%) scale(${z})`;
            point.style.opacity = z;
            
            vectorSpace.appendChild(point);
            
            // Création de lignes vectorielles pour certains points
            if (i < 5) {
                const line = document.createElement('div');
                line.classList.add('vector-line');
                
                // Origine à (10%, 10%)
                const originX = 10;
                const originY = 10;
                
                // Calcul de la longueur et de l'angle
                const dx = x - originX;
                const dy = y - originY;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                
                line.style.left = `${originX}%`;
                line.style.bottom = `${originY}%`;
                line.style.width = `${length}%`;
                line.style.transform = `rotate(${angle}deg)`;
                
                vectorSpace.appendChild(line);
            }
        }
    }
    
    // Initialisation du canvas de visualisation des distances
    function initDistanceCanvas() {
        const canvas = document.getElementById('distanceCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Points aléatoires
        const points = [];
        for (let i = 0; i < 50; i++) {
            points.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: 4 + Math.random() * 4
            });
        }
        
        // Point central
        const centerPoint = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            radius: 8
        };
        
        // Animation
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Dessiner les points
            points.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(76, 201, 240, 0.6)';
                ctx.fill();
            });
            
            // Dessiner le point central
            ctx.beginPath();
            ctx.arc(centerPoint.x, centerPoint.y, centerPoint.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#f72585';
            ctx.fill();
            
            // Dessiner les lignes de distance
            ctx.beginPath();
            points.forEach(point => {
                const dx = point.x - centerPoint.x;
                const dy = point.y - centerPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Dessiner seulement pour les points proches
                if (distance < 100) {
                    ctx.moveTo(centerPoint.x, centerPoint.y);
                    ctx.lineTo(point.x, point.y);
                    
                    // Texte de distance
                    const midX = (centerPoint.x + point.x) / 2;
                    const midY = (centerPoint.y + point.y) / 2;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.fillText(Math.round(distance), midX, midY);
                }
            });
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.stroke();
            
            requestAnimationFrame(animate);
        }
        
        animate();
    }
    
    // Initialisation de la visualisation des index
    function initIndexVisualization() {
        const container = document.getElementById('indexVisualization');
        if (!container) return;
        
        // Utilisation de D3.js pour créer une visualisation d'index
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Création de données pour un graphe HNSW
        const nodes = [];
        const links = [];
        
        // Nœuds à différents niveaux
        for (let level = 0; level < 3; level++) {
            const nodesPerLevel = 10 - level * 3;
            for (let i = 0; i < nodesPerLevel; i++) {
                nodes.push({
                    id: `node-${level}-${i}`,
                    level: level,
                    x: 100 + (width - 200) * (i / (nodesPerLevel - 1)),
                    y: 50 + level * 100
                });
            }
        }
        
        // Liens entre les nœuds
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            
            // Liens vers le niveau supérieur
            if (node.level > 0) {
                const upperLevelNodes = nodes.filter(n => n.level === node.level - 1);
                const closestNodes = upperLevelNodes
                    .map(n => ({
                        node: n,
                        distance: Math.abs(n.x - node.x)
                    }))
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, 2);
                
                closestNodes.forEach(({ node: targetNode }) => {
                    links.push({
                        source: node,
                        target: targetNode
                    });
                });
            }
            
            // Liens horizontaux
            const sameLevel = nodes.filter(n => n.level === node.level && n.id !== node.id);
            const closestSameLevel = sameLevel
                .map(n => ({
                    node: n,
                    distance: Math.abs(n.x - node.x)
                }))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 2);
            
            closestSameLevel.forEach(({ node: targetNode }) => {
                links.push({
                    source: node,
                    target: targetNode,
                    sameLevel: true
                });
            });
        }
        
        // Dessiner les liens
        svg.selectAll('line')
            .data(links)
            .enter()
            .append('line')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)
            .attr('stroke', d => d.sameLevel ? 'rgba(76, 201, 240, 0.3)' : 'rgba(247, 37, 133, 0.5)')
            .attr('stroke-width', 1.5);
        
        // Dessiner les nœuds
        svg.selectAll('circle')
            .data(nodes)
            .enter()
            .append('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => 8 - d.level * 2)
            .attr('fill', d => d.level === 0 ? '#4cc9f0' : d.level === 1 ? '#4361ee' : '#3a0ca3');
        
        // Animation
        function animateGraph() {
            svg.selectAll('circle')
                .transition()
                .duration(2000)
                .attr('r', d => (8 - d.level * 2) * (1 + Math.sin(Date.now() / 1000) * 0.2))
                .on('end', animateGraph);
        }
        
        animateGraph();
    }
    
    // Initialisation du graphique de benchmark
    function initBenchmarkChart() {
        const container = document.getElementById('benchmarkChart');
        if (!container) return;
        
        // Données de benchmark
        const data = {
            labels: ['Faiss Flat', 'Faiss HNSW', 'Milvus', 'Pinecone'],
            datasets: [
                {
                    label: 'Temps de recherche (ms)',
                    data: [100, 2, 2.5, 3],
                    backgroundColor: [
                        'rgba(76, 201, 240, 0.7)',
                        'rgba(67, 97, 238, 0.7)',
                        'rgba(58, 12, 163, 0.7)',
                        'rgba(247, 37, 133, 0.7)'
                    ],
                    borderColor: [
                        'rgba(76, 201, 240, 1)',
                        'rgba(67, 97, 238, 1)',
                        'rgba(58, 12, 163, 1)',
                        'rgba(247, 37, 133, 1)'
                    ],
                    borderWidth: 1
                },
                {
                    label: 'Précision (%)',
                    data: [100, 99, 98, 97],
                    backgroundColor: [
                        'rgba(76, 201, 240, 0.3)',
                        'rgba(67, 97, 238, 0.3)',
                        'rgba(58, 12, 163, 0.3)',
                        'rgba(247, 37, 133, 0.3)'
                    ],
                    borderColor: [
                        'rgba(76, 201, 240, 0.6)',
                        'rgba(67, 97, 238, 0.6)',
                        'rgba(58, 12, 163, 0.6)',
                        'rgba(247, 37, 133, 0.6)'
                    ],
                    borderWidth: 1
                }
            ]
        };
        
        // Configuration du graphique
        const config = {
            type: 'bar',
            data: data,
            options: {
                                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        };
        
        // Création du graphique
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        new Chart(canvas, config);
    }
    
    // Initialisation de la démonstration interactive
    function initDemoVisualization() {
        const container = document.getElementById('demoVisualization');
        if (!container) return;
        
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        
        // Redimensionner le canvas
        function resizeCanvas() {
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
        }
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Générer des points aléatoires
        const points = [];
        for (let i = 0; i < 200; i++) {
            points.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: 3 + Math.random() * 2,
                color: `hsl(${Math.random() * 60 + 180}, 70%, 60%)`,
                selected: false
            });
        }
        
        // Point de requête
        let queryPoint = null;
        
        // Dessiner la scène
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Dessiner les points
            points.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
                ctx.fillStyle = point.selected ? '#f72585' : point.color;
                ctx.fill();
                
                if (point.selected) {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, point.radius + 5, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(247, 37, 133, 0.5)';
                    ctx.stroke();
                }
            });
            
            // Dessiner le point de requête
            if (queryPoint) {
                ctx.beginPath();
                ctx.arc(queryPoint.x, queryPoint.y, 8, 0, Math.PI * 2);
                ctx.fillStyle = '#f72585';
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(queryPoint.x, queryPoint.y, 12, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(247, 37, 133, 0.7)';
                ctx.stroke();
                
                // Dessiner les lignes vers les points sélectionnés
                ctx.beginPath();
                points.forEach(point => {
                    if (point.selected) {
                        ctx.moveTo(queryPoint.x, queryPoint.y);
                        ctx.lineTo(point.x, point.y);
                    }
                });
                ctx.strokeStyle = 'rgba(247, 37, 133, 0.3)';
                ctx.stroke();
            }
        }
        
        // Gestionnaire de clic pour définir le point de requête
        canvas.addEventListener('click', function(e) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            queryPoint = { x, y };
            draw();
        });
        
        // Bouton de recherche
        const searchButton = document.getElementById('searchButton');
        if (searchButton) {
            searchButton.addEventListener('click', function() {
                if (!queryPoint) return;
                
                // Réinitialiser les points sélectionnés
                points.forEach(point => {
                    point.selected = false;
                });
                
                // Sélectionner les k points les plus proches
                const k = 5;
                const algorithm = document.getElementById('algorithmSelect').value;
                const metric = document.getElementById('metricSelect').value;
                
                // Calculer les distances
                const distances = points.map(point => {
                    let distance;
                    
                    if (metric === 'euclidean') {
                        const dx = point.x - queryPoint.x;
                        const dy = point.y - queryPoint.y;
                        distance = Math.sqrt(dx * dx + dy * dy);
                    } else if (metric === 'manhattan') {
                        distance = Math.abs(point.x - queryPoint.x) + Math.abs(point.y - queryPoint.y);
                    } else { // cosine
                        // Simuler une similarité cosinus en 2D
                        const dotProduct = point.x * queryPoint.x + point.y * queryPoint.y;
                        const normA = Math.sqrt(point.x * point.x + point.y * point.y);
                        const normB = Math.sqrt(queryPoint.x * queryPoint.x + queryPoint.y * queryPoint.y);
                        distance = 1 - (dotProduct / (normA * normB));
                    }
                    
                    return { point, distance };
                });
                
                // Trier par distance
                distances.sort((a, b) => a.distance - b.distance);
                
                // Sélectionner les k plus proches
                for (let i = 0; i < k; i++) {
                    if (i < distances.length) {
                        distances[i].point.selected = true;
                    }
                }
                
                // Afficher les résultats
                const resultsContainer = document.getElementById('searchResults');
                if (resultsContainer) {
                    let resultsHTML = `<p>Algorithme: <strong>${algorithm}</strong>, Métrique: <strong>${metric}</strong></p>`;
                    resultsHTML += '<ul>';
                    
                    for (let i = 0; i < k; i++) {
                        if (i < distances.length) {
                            resultsHTML += `<li>Point #${i+1}: Distance = ${distances[i].distance.toFixed(2)}</li>`;
                        }
                    }
                    
                    resultsHTML += '</ul>';
                    resultsContainer.innerHTML = resultsHTML;
                }
                
                // Redessiner
                draw();
            });
        }
        
        // Bouton de réinitialisation
        const resetButton = document.getElementById('resetButton');
        if (resetButton) {
            resetButton.addEventListener('click', function() {
                queryPoint = null;
                points.forEach(point => {
                    point.selected = false;
                });
                
                const resultsContainer = document.getElementById('searchResults');
                if (resultsContainer) {
                    resultsContainer.innerHTML = 'Cliquez sur "Rechercher" pour trouver les vecteurs similaires.';
                }
                
                draw();
            });
        }
        
        // Dessiner la scène initiale
        draw();
    }
    
    // Initialisation de la coloration syntaxique du code
    function initCodeHighlighting() {
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    }
    
    // Afficher la première slide
    slides[0].classList.add('slide-visible');
    
    // Animation des étapes d'algorithme sur la première slide
    animateCurrentSlideElements();
});

// Simulation de la bibliothèque hljs pour la coloration syntaxique
const hljs = {
    highlightBlock: function(block) {
        // Simuler la coloration syntaxique
        if (block.className.includes('python')) {
            const keywords = ['import', 'from', 'def', 'for', 'in', 'if', 'else', 'return', 'class', 'with'];
            const builtins = ['print', 'len', 'range', 'list', 'dict', 'set', 'tuple', 'map', 'filter', 'sum', 'min', 'max'];
            const operators = ['=', '+', '-', '*', '/', '%', '==', '!=', '<', '>', '<=', '>=', 'and', 'or', 'not'];
            
            let html = block.textContent;
            
            // Colorer les chaînes de caractères
            html = html.replace(/(["'])(.*?)\1/g, '<span style="color: #a5d6a7;">$&</span>');
            
            // Colorer les commentaires
            html = html.replace(/(#.*)$/gm, '<span style="color: #9e9e9e;">$&</span>');
            
            // Colorer les nombres
            html = html.replace(/\b(\d+)\b/g, '<span style="color: #ffab91;">$&</span>');
            
            // Colorer les mots-clés
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
                html = html.replace(regex, '<span style="color: #ff79c6;">$&</span>');
            });
            
            // Colorer les fonctions intégrées
            builtins.forEach(builtin => {
                const regex = new RegExp(`\\b(${builtin})\\b`, 'g');
                html = html.replace(regex, '<span style="color: #8be9fd;">$&</span>');
            });
            
            // Colorer les opérateurs
            operators.forEach(operator => {
                const regex = new RegExp(`\\${operator}`, 'g');
                html = html.replace(regex, '<span style="color: #ff79c6;">$&</span>');
            });
            
            block.innerHTML = html;
        }
    }
};

// Simulation de la bibliothèque Chart.js
class Chart {
    constructor(canvas, config) {
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
        
        // Dessiner un graphique simple
        const data = config.data;
        const barWidth = canvas.width / (data.labels.length * 2.5);
        const maxValue = Math.max(...data.datasets[0].data);
        const scale = (canvas.height - 60) / maxValue;
        
        // Fond
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Axes
        ctx.beginPath();
        ctx.moveTo(40, 20);
        ctx.lineTo(40, canvas.height - 40);
        ctx.lineTo(canvas.width - 20, canvas.height - 40);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.stroke();
        
        // Étiquettes des axes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        data.labels.forEach((label, i) => {
            const x = 40 + (i + 0.5) * ((canvas.width - 60) / data.labels.length);
            ctx.fillText(label, x, canvas.height - 20);
        });
        
        // Barres
        data.datasets.forEach((dataset, datasetIndex) => {
            dataset.data.forEach((value, i) => {
                const x = 40 + (i + 0.2 + datasetIndex * 0.3) * ((canvas.width - 60) / data.labels.length);
                const height = value * scale;
                const y = canvas.height - 40 - height;
                
                ctx.fillStyle = dataset.backgroundColor[i];
                ctx.fillRect(x, y, barWidth, height);
                
                ctx.strokeStyle = dataset.borderColor[i];
                ctx.strokeRect(x, y, barWidth, height);
                
                // Valeur
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.fillText(value, x + barWidth / 2, y - 5);
            });
        });
        
        // Légende
        const legendY = 10;
        let legendX = canvas.width - 200;
        
        data.datasets.forEach((dataset, i) => {
            ctx.fillStyle = dataset.backgroundColor[0];
            ctx.fillRect(legendX, legendY, 15, 15);
            
            ctx.strokeStyle = dataset.borderColor[0];
            ctx.strokeRect(legendX, legendY, 15, 15);
            
            ctx.fillStyle = 'white';
            ctx.textAlign = 'left';
            ctx.fillText(dataset.label, legendX + 20, legendY + 12);
            
            legendX += 150;
        });
    }
}

// Simulation de la bibliothèque D3.js
const d3 = {
    select: function(selector) {
        const element = typeof selector === 'string' 
            ? document.querySelector(selector) 
            : selector;
        
        return {
            append: function(tagName) {
                const newElement = document.createElement(tagName);
                element.appendChild(newElement);
                return d3.select(newElement);
            },
            attr: function(name, value) {
                element.setAttribute(name, value);
                return this;
            },
            selectAll: function(selector) {
                return {
                    data: function(data) {
                        this.dataArray = data;
                        return {
                            enter: function() {
                                return {
                                    append: function(tagName) {
                                        const elements = [];
                                        data.forEach((d, i) => {
                                            const newElement = document.createElement(tagName);
                                            element.appendChild(newElement);
                                            elements.push(newElement);
                                        });
                                        
                                        return {
                                                                                        attr: function(name, valueFn) {
                                                elements.forEach((el, i) => {
                                                    const value = typeof valueFn === 'function' 
                                                        ? valueFn(data[i], i) 
                                                        : valueFn;
                                                    el.setAttribute(name, value);
                                                });
                                                return this;
                                            },
                                            transition: function() {
                                                return this;
                                            },
                                            duration: function() {
                                                return this;
                                            },
                                            on: function(event, callback) {
                                                return this;
                                            }
                                        };
                                    }
                                };
                            }
                        };
                    }
                };
            },
            transition: function() {
                return this;
            },
            duration: function() {
                return this;
            },
            on: function(event, callback) {
                return this;
            }
        };
    }
};
