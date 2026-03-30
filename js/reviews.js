(function() {   
    // Раскрытие карточек
    function initReviewCards() {
        const cards = document.querySelectorAll('.review-card');
        const reviewsContainer = document.querySelector('.reviews-container');

        if (!reviewsContainer) return;

        // функция для скролла наверх
        function scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        cards.forEach(card => {
            const toggleBtn = card.querySelector('.toggle-btn');
            const previewDiv = card.querySelector('.review-preview');
            const fullDiv = card.querySelector('.review-full');
            const btnIcon = toggleBtn?.querySelector('.btn-icon');
            const btnText = toggleBtn?.querySelector('.btn-text');
            
            if (toggleBtn && previewDiv && fullDiv && btnIcon && btnText) {
                toggleBtn.addEventListener('click', () => {
                    const isExpanded = fullDiv.style.display === 'block';
                    
                    if (!isExpanded) {                       
                        // скрываем остальные карточки
                        cards.forEach(c => {
                            if (c !== card) c.style.display = 'none';
                        });
                        
                        // меняем сетку на одну колонку
                        reviewsContainer.classList.add('single-column');
                        
                        // разворачиваем текущую карточку
                        fullDiv.style.display = 'block';
                        previewDiv.style.display = 'none';
                        btnText.textContent = 'Свернуть';
                        btnIcon.style.transform = 'rotate(180deg)';
                        toggleBtn.setAttribute('aria-expanded', 'true');
                        card.classList.add('expanded-card');

                        // скролл наверх
                        scrollToTop();
                                               
                    } else {
                        // сворачиваем текущую карточку
                        fullDiv.style.display = 'none';
                        previewDiv.style.display = 'block';
                        btnText.textContent = 'Полный текст';
                        btnIcon.style.transform = 'rotate(0deg)';
                        toggleBtn.setAttribute('aria-expanded', 'false');
                        card.classList.remove('expanded-card');
                        
                        // возвращаем сетку к исходному состоянию
                        reviewsContainer.classList.remove('single-column');
                        
                        // показываем все карточки
                        cards.forEach(c => {
                            c.style.display = 'flex';
                            c.style.animationDuration = '0.3s';
                            c.style.animationDelay = '0.2s';
                        });

                        // скролл наверх
                        scrollToTop();
                    }
                });
            }
        });
    }
    
    // Открытие PDF
    function initPdfButtons() {
        const pdfBtns = document.querySelectorAll('.pdf-btn');
        
        pdfBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const pdfPath = btn.getAttribute('data-pdf');
                if (pdfPath) {
                    window.open(pdfPath, '_blank');
                }
            });
        });
    }

    // Переключение тем
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
       
    // Инициализация
    function init() {
        initReviewCards();
        initPdfButtons();
        initThemeSwitcher();
    }
    
    init();
})();