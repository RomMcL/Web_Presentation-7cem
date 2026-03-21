
(function() {
    // ===== МОДЕЛЬ: слайды загружаются из папки /slides/slide_1.html ... slide_n.html =====
    const slides = [
        { title: 'Начальный слайд', file: 'slide_first.html', autoDelay: 3000 },
        { title: 'Содержание презентации', file: 'slide_presContent.html', autoDelay: 7000 },
        { title: 'Контекст', file: 'slide_context.html', autoDelay: 7000 },
        { title: 'Проблема', file: 'slide_whyImpossible.html', autoDelay: 7000 },
        { title: 'Решение', file: 'slide_solution.html', autoDelay: 8500 },
        { title: 'Анализаторы', file: 'slide_analyzer.html', autoDelay: 3000 },
        { title: 'Возможности программы', file: 'slide_opportunities.html', autoDelay: 3000 },
        { title: 'Экономика', file: 'slide_economy.html', autoDelay: 3000 },
        { title: 'Преимущества', file: 'slide_bonusCards.html', autoDelay: 3000 },
        { title: 'Модель', file: 'slide_annualEffect.html', autoDelay: 3000 },
        { title: 'Доказательства', file: 'slide_proofs.html', autoDelay: 3000 },
        { title: 'Частые вопросы', file: 'slide_faq.html', autoDelay: 3000 },        
        { title: 'Финальный слайд', file: 'slide_end.html', autoDelay: 5000 },
    ];

    // Базовый путь к папке со слайдами (относительно index.html)
    const SLIDES_FOLDER = 'slides/';

    // ------ состояние -----
    let currentSlide = 0;
    let autoMode = false;
    let autoTimeout = null;     // для индивидуальных задержек
    const defaultDelay = 5000;  // задержка по умолчанию, если не указана autoDelay
    let isFirstAutoRun = true;  // флаг первого запуска авторежима
    let isModalOpen = false;

    // DOM элементы
    const btnDemoHeader = document.getElementById('btnDemoHeader');
    const slideContentDiv = document.getElementById('slideContent');
    const slideCounterSpan = document.getElementById('slideCounter');
    const pageDotsDiv = document.getElementById('pageDots');
    const btnAuto = document.getElementById('btnAuto');
    const prevBtn = document.getElementById('prevSlideBtn');
    const nextBtn = document.getElementById('nextSlideBtn');
    const autoplayIndicator = document.getElementById('autoplayIndicator');

    // Функции для работы с модальными окнами
    function openModal(modalId) {
        const overlay = document.getElementById('modalOverlay');
        const modal = document.getElementById(modalId);
        
        if (!overlay || !modal) return;
        
        if (autoMode) {
            setAutoMode(false);
        }
        
        overlay.classList.add('active');
        document.querySelectorAll('.modal').forEach(m => {
            m.style.display = 'none';
        });
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
        isModalOpen = true;
    }

    function closeModal() {
        const overlay = document.getElementById('modalOverlay');
        if (!overlay) return;
        overlay.classList.remove('active');
        document.querySelectorAll('.modal').forEach(m => {
            m.style.display = 'none';
        });
        document.body.classList.remove('modal-open');
        isModalOpen = false;
    }

    // Загрузка содержимого слайда через fetch (запрос к файлу)
    async function loadSlideContent(slide) {
        const url = SLIDES_FOLDER + slide.file;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: не удалось загрузить ${url}`);
        }
        return await response.text();
    }

    // Рендер слайда с асинхронной загрузкой HTML
    async function renderSlide(index) {
        const slide = slides[index];
        if (!slide) return;

        // Показываем индикатор загрузки
        slideContentDiv.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p class="loading-text">Загрузка слайда <br> ${slide.title}...</p>
            </div>
        `;

        try {
            const bodyHtml = await loadSlideContent(slide);

            // ОЧИЩАЕМ HTML от потенциально опасного кода
            const cleanHtml = DOMPurify.sanitize(bodyHtml, {
                ALLOWED_TAGS: ['p', 'div', 'span', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                            'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'table',
                            'thead', 'tbody', 'tr', 'th', 'td', 'br', 'hr', 'img',
                            'a', 'blockquote', 'pre', 'code', 'section', 'article'],
                ALLOWED_ATTR: ['class', 'id', 'style', 'src', 'alt', 'href', 'target']
            });

            // Вставляем загруженное содержимое (которое уже содержит разметку слайда)
            slideContentDiv.innerHTML = cleanHtml;

            // обновить счётчик
            slideCounterSpan.innerText = `${index+1} / ${slides.length}`;

            // обновить dots
            const dotsHtml = slides.map((_, i) => {
                return `<button class="dot ${i === index ? 'active' : ''}" data-index="${i}"></button>`;
            }).join('');
            pageDotsDiv.innerHTML = dotsHtml;

            // навесить обработчики на dots
            document.querySelectorAll('.dot').forEach(dot => {
                dot.addEventListener('click', (e) => {
                    const idx = e.target.getAttribute('data-index');
                    if (idx !== null) {
                        goToSlide(parseInt(idx, 10));
                    }
                });
            });

            // Если включен авторежим, запускаем таймер для следующего слайда
            if (autoMode) {
                scheduleNextSlide();
            }

        } catch (error) {
            slideContentDiv.innerHTML = `<div class="error-message">❌ Ошибка загрузки слайда: ${error.message}</div>`;
        }
    }

    // Планирование следующего слайда в авторежиме
    function scheduleNextSlide() {
        // Очищаем предыдущий таймер, если был
        if (autoTimeout) {
            clearTimeout(autoTimeout);
            autoTimeout = null;
        }

        // Определяем задержку
        let delay;
        if (isFirstAutoRun) {
            delay = 500;  // быстрый старт - 500 мс
            isFirstAutoRun = false;  // сбрасываем флаг, дальше используем стандартные задержки
        } else {
            const currentSlideData = slides[currentSlide];
            delay = currentSlideData.autoDelay || defaultDelay;
        }

        autoTimeout = setTimeout(() => {
            const next = currentSlide + 1;
            
            if (next >= slides.length) {
                // Дошли до последнего - переходим на первый и выключаем авторежим
                goToSlide(0);
                setAutoMode(false);
            } else {
                goToSlide(next);
            }
        }, delay);
    }

    // переход с проверкой границ
    function goToSlide(newIndex) {
        // Только forward зациклен, backward - нет
        if (newIndex < 0) newIndex = 0;  // назад не зациклен - остаемся на первом
        if (newIndex >= slides.length) newIndex = 0;  // вперед зациклен на первый
        
        if (newIndex === currentSlide) return;
        currentSlide = newIndex;
        renderSlide(currentSlide);
    }

    function nextSlide() {
        if (autoMode) setAutoMode(false);
        goToSlide(currentSlide + 1);
    }

    function prevSlide() {
        if (autoMode) setAutoMode(false);
        goToSlide(currentSlide - 1);
    }

    function autoSlide() {
        if (!autoMode) setAutoMode(true);
        else setAutoMode(false);
    }

    // авто режим
    function setAutoMode(enabled) {
        if (enabled === autoMode) return;

        if (enabled) {
            autoMode = true;
            isFirstAutoRun = true;
            
            // Очищаем предыдущий таймер
            if (autoTimeout) {
                clearTimeout(autoTimeout);
                autoTimeout = null;
            }
            
            autoplayIndicator.innerText = '⏵ авто режим';
            // Запускаем планирование для текущего слайда
            scheduleNextSlide();
        } else {
            autoMode = false;
            // Очищаем таймер
            if (autoTimeout) {
                clearTimeout(autoTimeout);
                autoTimeout = null;
            }
            autoplayIndicator.innerText = '⏹ ручной режим';
        }
        updateActiveModeButtons();
    }

    function updateActiveModeButtons() {
        if (autoMode) {
            btnAuto.classList.add('btn-active');
            prevBtn.classList.remove('btn-active');
            nextBtn.classList.remove('btn-active');
        } else {
            prevBtn.classList.add('btn-active');
            nextBtn.classList.add('btn-active');
            btnAuto.classList.remove('btn-active');
        }
    }

    function initFirstSlideBtns() {
        // Делегирование событий для всех кнопок внутри слайдов
        slideContentDiv.addEventListener('click', (e) => {
            // Находим ближайшую кнопку с классом slide-first_btn
            const btn = e.target.closest('.slide-first_btn');
            if (!btn) return;
            
            // Обрабатываем кнопки по их id
            switch(btn.id) {
                case 'btnStartPresentation':
                    if (!autoMode) setAutoMode(true);
                    else setAutoMode(false);
                    break;
                case 'btnCodeRequest':
                    openModal('codeRequestModal');
                    break;
                case 'btnDemoSlide':
                    openModal('demoModal');
                    break;
                default:
                    break;
            }
        });
    }

    function initModals() {
        const overlay = document.getElementById('modalOverlay');
        const closeButtons = document.querySelectorAll('.modal-close, .modal-btn-close');
        
        if (!overlay) return;
        
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
        
        closeButtons.forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isModalOpen) {
                closeModal();
            }
        });
    }

    // инициализация
    async function init() {
        await renderSlide(0); // начинаем с первого слайда
        setAutoMode(false);
        initModals();

        // кнопки
        btnAuto.addEventListener('click', autoSlide);
        prevBtn.addEventListener('click', prevSlide);
        nextBtn.addEventListener('click', nextSlide);
        if (btnDemoHeader) {
            btnDemoHeader.addEventListener('click', () => {openModal('demoModal')});
        }
        initFirstSlideBtns(); // делегирование слушателей кнопок стартового слайда
        

        // клавиши
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevSlide();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextSlide();
            }
        });
    }

    init();
})();