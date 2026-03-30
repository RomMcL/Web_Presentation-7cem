
(function() {
    // ===== МОДЕЛЬ: слайды загружаются из папки /slides/slide_1.html ... slide_n.html =====
    const slides = [
        { title: 'Начальный слайд', file: 'slide_first.html', autoDelay: 3000 },
        { title: 'Содержание презентации', file: 'slide_presContent.html', autoDelay: 9000 },
        { title: 'Контекст', file: 'slide_context.html', autoDelay: 14000 },
        { title: 'Проблема', file: 'slide_whyImpossible.html', autoDelay: 27000 },
        { title: 'Решение', file: 'slide_solution.html', autoDelay: 27000 },
        { title: 'Анализаторы', file: 'slide_analyzer.html', autoDelay: 22000 },
        { title: 'Возможности программы', file: 'slide_opportunities.html', autoDelay: 16000 },
        { title: 'Экономика', file: 'slide_economy.html', autoDelay: 21000 },
        { title: 'Преимущества', file: 'slide_bonusCards.html', autoDelay: 14000 },
        { title: 'Модель', file: 'slide_annualEffect.html', autoDelay: 12000 },
        { title: 'Доказательства', file: 'slide_proofs.html', autoDelay: 16000 },
        { title: 'Частые вопросы', file: 'slide_faq.html', autoDelay: 26000 },
        { title: 'Финальный слайд', file: 'slide_end.html', autoDelay: 22000 },
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
                const slideTitle = slides[i].title;
                const tooltipText = `Слайд ${i+1}: ${slideTitle}`;
                return `<button class="dot ${i === index ? 'active' : ''}" data-index="${i}" data-tooltip="${tooltipText.replace(/"/g, '&quot;')}"></button>`;
            }).join('');
            pageDotsDiv.innerHTML = dotsHtml;

            // навесить обработчики на dots
            document.querySelectorAll('.dot').forEach(dot => {
                dot.addEventListener('click', (e) => {
                    if (autoMode) setAutoMode(false);

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

    // Переход с проверкой границ
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

    // Функция для инициализации свайпов на тач-устройствах
    function initSwipeSupport() {
        let touchStartX = 0;
        let touchEndX = 0;
        let touchStartTime = 0;
        let touchStartY = 0;
        let isSwiping = false;
        const minSwipeDistance = 50;
        const maxSwipeTime = 300;
        
        function handleSwipe() {
            const swipeDistance = touchEndX - touchStartX;
            const swipeTime = Date.now() - touchStartTime;
            
            if (Math.abs(swipeDistance) >= minSwipeDistance && swipeTime <= maxSwipeTime) {
                if (swipeDistance > 0) {
                    prevSlide();
                } else {
                    nextSlide();
                }
            }
        }
        
        const slideArea = document.getElementById('slideArea');
        if (!slideArea) return;
        
        slideArea.addEventListener('touchstart', (e) => {
            // Не обрабатываем свайп, если начали с интерактивных элементов
            if (e.target.closest('button, a, input, [role="button"], .modal, .modal *')) {
                return;
            }
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            touchStartTime = Date.now();
            isSwiping = true;
        }, { passive: true });
        
        slideArea.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            
            const moveX = e.changedTouches[0].screenX;
            const deltaX = Math.abs(moveX - touchStartX);
            const deltaY = Math.abs(e.changedTouches[0].screenY - touchStartY);
            
            // Если движение преимущественно горизонтальное, предотвращаем скролл
            if (deltaX > deltaY && deltaX > 10) {
                e.preventDefault();
            }
        });
        
        slideArea.addEventListener('touchend', (e) => {
            if (!isSwiping) return;
            
            if (e.target.closest('button, a, input, [role="button"], .modal, .modal *')) {
                isSwiping = false;
                return;
            }
            
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
            isSwiping = false;
        });
        
        slideArea.addEventListener('touchcancel', () => {
            isSwiping = false;
        });
    }

    // Авто режим
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

    // Модальные окна
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

    // Обработка формы ввода кода для демо-доступа
    function initDemoForm() {
        const accessCodeInput = document.getElementById('accessCode');
        const errorDiv = document.getElementById('formDemoErrorMessage');
        const startDemoBtn = document.getElementById('startDemoBtn');
        const requestCodeBtn = document.getElementById('requestCodeBtn');
        
        if (startDemoBtn) {
            startDemoBtn.addEventListener('click', () => {
                const code = accessCodeInput?.value.trim();
                
                if (!code) {
                    if (errorDiv) {
                        errorDiv.textContent = 'Пожалуйста, введите код доступа';
                        errorDiv.classList.add('show');
                    }
                    return;
                }
                
                // Здесь логика проверки кода
                if (code === '111') { // пример
                    errorDiv.classList.remove('show');
                    closeModal();
                    // Код верный - пускаем дальше
                    console.log('Введён верный код доступа');
                } else {
                    if (errorDiv) {
                        errorDiv.textContent = 'Неверный код доступа. Попробуйте еще раз или запросите новый код.';
                        errorDiv.classList.add('show');
                    }
                    if (accessCodeInput) accessCodeInput.value = '';
                    accessCodeInput?.focus();
                }
            });
        }

        // Подтверждение введённого кода клавишей Enter
        if (accessCodeInput) {
            accessCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    startDemoBtn?.click();
                }
            });
        }

        // Переход к модалке с запросом кода (mail)
        if (requestCodeBtn) {
            requestCodeBtn.addEventListener('click', () => {
                openModal('codeRequestModal');
            });
        }
    }

    // Обработка формы отправки письма
    function initCodeRequestForm() {
        const submitBtn = document.getElementById('submitRequestBtn');
        const cancelBtn = document.getElementById('cancelRequestBtn');
        const form = document.getElementById('codeRequestForm');
        const descriptionElem = document.getElementById('descriptionRequestForm');
        const waitingLoader = document.getElementById('waitingMailLoader');
        const errorDiv = document.getElementById('formErrorMessage');
        const successDiv = document.getElementById('formSuccessMessage');
        
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                // Скрываем предыдущие сообщения и показываем описание
                hideAllMessages();
                showDescription();
                
                // Собираем данные формы
                const userName = document.getElementById('userName')?.value.trim();
                const userEmail = document.getElementById('userEmail')?.value.trim();
                const userMessage = document.getElementById('userMessage')?.value.trim();
                const userCompany = document.getElementById('userCompany')?.value.trim();
                const userPhone = document.getElementById('userPhone')?.value.trim();
                
                // Валидация
                if (!userName) {
                    showFormError('Пожалуйста, укажите ваше имя');
                    return;
                }
                if (!userEmail) {
                    showFormError('Пожалуйста, укажите email для отправки кода');
                    return;
                }
                if (!isValidEmail(userEmail)) {
                    showFormError('Пожалуйста, введите корректный email');
                    return;
                }
                if (!userMessage) {
                    showFormError('Пожалуйста, заполните комментарий');
                    return;
                }
                
                // Блокируем кнопку и показываем лоадер
                setButtonLoading(true);
                showLoader();

                // Параметры для EmailJS
                const parameters = {
                    name: userName,
                    email: userEmail,
                    message: userMessage,
                    company: userCompany || 'Не указано',
                    phone: userPhone || 'Не указано',
                    date: updateTime()
                };

                /* const serviceID = ''; // serviceID
                const templateID = ''; // templateID */
               
                try {

                    // Временная имитация (удалить после добавления реального API)
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    /* // Отправка письма через EmailJS
                    await emailjs.send(serviceID, templateID, parameters); */

                    // Скрываем лоадер и формируем сообщение об успехе
                    hideLoader();
                    showFormSuccess('Запрос отправлен! Ответ будет выслан на указанный email в ближайшее время.');
                    // Очищаем форму
                    if (form) form.reset();
                    // Закрываем модалку через 3 секунды
                    setTimeout(() => {
                        closeModal();
                    }, 3000);

                } catch (error) {
                    console.error('Ошибка отправки:', error);
                    showFormError('Ошибка соединения. Проверьте интернет-соединение.');
                } finally {
                    // Разблокируем кнопку
                    setButtonLoading(false);
                }
            });
        }

        // Функция для установки состояния загрузки кнопки
        function setButtonLoading(isLoading) {
            if (!submitBtn || !cancelBtn) return;
            
            if (isLoading) {
                submitBtn.disabled = true;
                submitBtn.classList.add('btn-disabled');
                cancelBtn.disabled = true;
                cancelBtn.classList.add('btn-disabled');
                // Сохраняем исходный текст
                submitBtn.setAttribute('data-original-text', submitBtn.textContent);
                submitBtn.textContent = 'Отправка запроса';
            } else {
                submitBtn.disabled = false;
                submitBtn.classList.remove('btn-disabled');
                cancelBtn.disabled = false;
                cancelBtn.classList.remove('btn-disabled');
                // Восстанавливаем исходный текст
                const originalText = submitBtn.getAttribute('data-original-text');
                if (originalText) {
                    submitBtn.textContent = originalText;
                } else {
                    submitBtn.textContent = 'Отправить запрос';
                }
            }
        }
        
        // Функция для показа лоадера
        function showLoader() {
            hideDescription();
            if (waitingLoader) {
                waitingLoader.style.display = 'flex';
            }
        }
        
        // Функция для скрытия лоадера
        function hideLoader() {
            if (waitingLoader) {
                waitingLoader.style.display = 'none';
            }
        }

        // Функция для скрытия всех сообщений и показа описания
        function hideAllMessages() {
            if (errorDiv) {
                errorDiv.classList.remove('show');
                errorDiv.style.display = 'none';
            }
            if (successDiv) {
                successDiv.style.display = 'none';
            }
            hideLoader();
        }
        
        // Функция для показа описания
        function showDescription() {
            if (descriptionElem) {
                descriptionElem.style.display = 'flex';
            }
        }
        
        // Функция для скрытия описания
        function hideDescription() {
            if (descriptionElem) {
                descriptionElem.style.display = 'none';
            }
        }
        
        // Функция для показа ошибки
        function showFormError(message) {
            hideDescription();
            hideLoader();
            if (errorDiv) {
                errorDiv.textContent = message;
                errorDiv.classList.add('show');
                errorDiv.style.display = 'flex';
            }
            if (successDiv) {
                successDiv.style.display = 'none';
            }
        }
        
        // Функция для показа успеха
        function showFormSuccess(message) {
            hideDescription();
            hideLoader();
            if (successDiv) {
                successDiv.textContent = message;
                successDiv.style.display = 'flex';
            }
            if (errorDiv) {
                errorDiv.classList.remove('show');
                errorDiv.style.display = 'none';
            }
        }
        
        // Функция валидации email
        function isValidEmail(email) {
            const re = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
            return re.test(email);
        }

        // Получение даты и времени в формате "дд.мм.гг чч:мм"
        function updateTime() {
            const date = new Date();        
            const formatted = `${String(date.getDate()).padStart(2, '0')}.` +
                            `${String(date.getMonth() + 1).padStart(2, '0')}.` +
                            `${String(date.getFullYear()).slice(-2)} ` +
                            `${String(date.getHours()).padStart(2, '0')}:` +
                            `${String(date.getMinutes()).padStart(2, '0')}`;
            
            return formatted;
        };

        
        // Очистка сообщений при начале ввода в поля
        const inputs = ['userName', 'userEmail', 'userMessage', 'userCompany', 'userPhone'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('focus', () => {
                    if (errorDiv && errorDiv.style.display === 'flex') {
                        hideAllMessages();
                        showDescription();
                    }
                });
            }
        });
    }

    // Инициализация переключателя тем
    function initThemeSwitcher() {
        const themeBtn = document.getElementById('themeSwitcherBtn');
        const themeSwitcher = document.querySelector('.theme-switcher');
        const themeOptions = document.querySelectorAll('input[name="theme"]');
        
        // Загружаем сохраненную тему
        const savedTheme = localStorage.getItem('theme') || 'soft';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Устанавливаем активную радио-кнопку
        const activeRadio = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
        if (activeRadio) activeRadio.checked = true;
        
        // Открытие/закрытие тултипа
        if (themeBtn && themeSwitcher) {
            themeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                themeSwitcher.classList.toggle('active');
            });
            
            // Закрытие при клике вне тултипа
            document.addEventListener('click', (e) => {
                if (!themeSwitcher.contains(e.target)) {
                    themeSwitcher.classList.remove('active');
                }
            });
        }
        
        // Смена темы
        themeOptions.forEach(option => {
            option.addEventListener('change', (e) => {
                const theme = e.target.value;
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('theme', theme);
                themeSwitcher.classList.remove('active');
            });
        });
    }


    // инициализация
    async function init() {
        await renderSlide(0); // начинаем с первого слайда
        setAutoMode(false);
        // модальные окна
        initModals();
        initDemoForm();
        /* emailjs.init(''); // Инициализация EmailJS с публичным ключом */
        initCodeRequestForm();
        // темы
        initThemeSwitcher();

        // кнопки
        btnAuto.addEventListener('click', autoSlide);
        prevBtn.addEventListener('click', prevSlide);
        nextBtn.addEventListener('click', nextSlide);
        if (btnDemoHeader) {
            btnDemoHeader.addEventListener('click', () => {openModal('demoModal')});
        }
        initFirstSlideBtns(); // кнопки стартового слайда
        
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

        // поддержка свайпов на тач-устройствах
        initSwipeSupport();
    }

    init();
})();
