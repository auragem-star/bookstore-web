// Main Application Logic for Cairo Bookstore
document.addEventListener('DOMContentLoaded', () => {
  const WHATSAPP_PHONE = '201012123955'; // Cairo Bookstore WhatsApp Number

  // Application State
  let rawBooksList = [];
  let activeCategory = 'foundation'; // foundation | kg | primary | prep | sec
  let activePathway = 'عربي';        // عربي | لغات | أزهر
  let activeCompany = 'الكل';        // For foundation stage
  let activeGrade = '';
  let activeBook = null;
  let activeStep = 1;

  // DOM Elements
  const categoryTabs = document.querySelectorAll('.cat-tab');
  const pathwaySelector = document.getElementById('pathway-selector');
  const pathwayButtons = document.getElementById('pathway-buttons');
  const companySelector = document.getElementById('company-selector');
  const companyChips = document.getElementById('company-chips');
  const gradesSelectionBlock = document.getElementById('grades-selection-block');
  const gradesGridTitle = document.getElementById('grades-grid-title');
  const gradesGrid = document.getElementById('grades-grid');
  
  const booksList = document.getElementById('books-list');
  const searchInput = document.getElementById('book-search');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const selectedPathLabel = document.getElementById('selected-path-label');

  // Step Elements
  const step1Content = document.getElementById('step-1-content');
  const step2Content = document.getElementById('step-2-content');
  const step3Content = document.getElementById('step-3-content');
  
  const stepInd1 = document.getElementById('step-ind-1');
  const stepInd2 = document.getElementById('step-ind-2');
  const stepInd3 = document.getElementById('step-ind-3');
  const stepLine1 = document.getElementById('step-line-1');
  const stepLine2 = document.getElementById('step-line-2');

  // Receipt Elements
  const receiptPathway = document.getElementById('receipt-pathway');
  const receiptGrade = document.getElementById('receipt-grade');
  const receiptPublisher = document.getElementById('receipt-publisher');
  const receiptBookName = document.getElementById('receipt-book-name');
  const receiptPrice = document.getElementById('receipt-price');
  const btnOrderWhatsapp = document.getElementById('btn-order-whatsapp');

  // Stage mapping & default grade titles
  const STAGE_GRADES = {
    kg: [
      { id: 'كي جي 1', label: 'كي جي 1 (مستوى أول)', icon: 'baby' },
      { id: 'كي جي 2', label: 'كي جي 2 (مستوى ثاني)', icon: 'baby' }
    ],
    primary: [
      { id: '1 ابتدائي', label: 'الصف الأول الابتدائي', icon: 'sparkles' },
      { id: '2 ابتدائي', label: 'الصف الثاني الابتدائي', icon: 'sparkles' },
      { id: '3 ابتدائي', label: 'الصف الثالث الابتدائي', icon: 'sparkles' },
      { id: '4 ابتدائي', label: 'الصف الرابع الابتدائي', icon: 'sparkles' },
      { id: '5 ابتدائي', label: 'الصف الخامس الابتدائي', icon: 'sparkles' },
      { id: '6 ابتدائي', label: 'الصف السادس الابتدائي', icon: 'sparkles' }
    ],
    prep: [
      { id: '1 إعدادي', label: 'الصف الأول الإعدادي', icon: 'book-open' },
      { id: '2 إعدادي', label: 'الصف الثاني الإعدادي', icon: 'book-open' },
      { id: '3 إعدادي', label: 'الصف الثالث الإعدادي', icon: 'book-open' }
    ],
    sec: [
      { id: '1 ثانوي', label: 'الصف الأول الثانوي', icon: 'award' },
      { id: '2 ثانوي', label: 'الصف الثاني الثانوي', icon: 'award' },
      { id: '3 ثانوي', label: 'الصف الثالث الثانوي', icon: 'award' }
    ]
  };

  // Fetch API Data
  async function loadData() {
    try {
      const res = await fetch('/api/books');
      if (!res.ok) throw new Error('تعذر جلب البيانات');
      rawBooksList = await res.json();
      renderStep1Filters();
    } catch (err) {
      console.error(err);
      gradesGrid.innerHTML = `
        <div class="no-books-found">
          <i data-lucide="alert-triangle" style="width: 48px; height: 48px; color: var(--primary);"></i>
          <p style="font-weight: 700;">حدث خطأ أثناء تحميل بيانات الكتب!</p>
          <p style="color: var(--text-muted); font-size: 0.9rem;">يرجى إعادة المحاولة لاحقاً.</p>
        </div>
      `;
      lucide.createIcons();
    }
  }

  // Render Step 1 dynamic UI based on Category (foundation vs kg vs school stages)
  function renderStep1Filters() {
    // 1. Foundation Category Logic
    if (activeCategory === 'foundation') {
      pathwaySelector.style.display = 'none';
      companySelector.style.display = 'block';
      gradesSelectionBlock.style.display = 'none';

      // Collect available companies in foundation
      const companiesSet = new Set();
      rawBooksList.forEach(item => {
        // Use the new dynamic property from the backend
        if (item.stage === 'foundation' || item.grade === 'تأسيس') {
          if (item.company) companiesSet.add(item.company);
        }
      });
      const companiesList = companiesSet.size > 0 ? ['الكل', ...Array.from(companiesSet)] : ['الكل'];

      companyChips.innerHTML = '';
      companiesList.forEach(comp => {
        const btn = document.createElement('button');
        btn.className = `chip-btn ${activeCompany === comp ? 'active' : ''}`;
        btn.innerText = comp;
        btn.addEventListener('click', () => {
          activeCompany = comp;
          activeGrade = 'تأسيس';
          selectGradeAndProceed('تأسيس');
        });
        companyChips.appendChild(btn);
      });

    } else {
      // 2. School Stages (KG, Primary, Prep, Sec)
      companySelector.style.display = 'none';
      pathwaySelector.style.display = 'block';
      gradesSelectionBlock.style.display = 'block';

      // Render Pathway Options
      const availablePathways = (activeCategory === 'kg') ? ['عربي', 'لغات'] : ['عربي', 'لغات', 'أزهر'];
      
      // Reset pathway if not in allowed list
      if (!availablePathways.includes(activePathway)) {
        activePathway = 'عربي';
      }

      pathwayButtons.innerHTML = '';
      availablePathways.forEach(pw => {
        const btn = document.createElement('button');
        btn.className = `pathway-btn ${activePathway === pw ? 'active' : ''}`;
        btn.innerText = pw;
        btn.addEventListener('click', () => {
          activePathway = pw;
          renderStep1Filters();
        });
        pathwayButtons.appendChild(btn);
      });

      // Render Grades Grid for active Category & Pathway
      renderGradesGrid();
    }

    lucide.createIcons();
  }

  // Render Grades Grid for school stages
  function renderGradesGrid() {
    gradesGrid.innerHTML = '';
    const grades = STAGE_GRADES[activeCategory] || [];
    gradesGridTitle.innerText = 'اختر الصف الدراسي:';

    grades.forEach(g => {
      // Check count of books for this grade & pathway
      const count = rawBooksList.filter(item => item.grade === g.id && item.pathway === activePathway).length;

      const btn = document.createElement('button');
      btn.className = 'grade-btn';
      if (count === 0) {
        btn.style.opacity = '0.55';
      }

      btn.innerHTML = `
        <i data-lucide="${g.icon}" class="grade-icon"></i>
        <span>${g.label}</span>
      `;

      btn.addEventListener('click', () => {
        activeGrade = g.id;
        selectGradeAndProceed(g.id);
      });

      gradesGrid.appendChild(btn);
    });

    lucide.createIcons();
  }

  // Handle Category Tab switching
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      categoryTabs.forEach(t => t.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      activeCategory = target.dataset.category;
      activeCompany = 'الكل';
      renderStep1Filters();
    });
  });

  // Proceed to Step 2
  function selectGradeAndProceed(gradeId) {
    activeStep = 2;
    updateStepIndicators();

    let pathLabel = '';
    if (activeCategory === 'foundation') {
      pathLabel = `قسم التأسيس | شركة: ${activeCompany}`;
    } else {
      pathLabel = `${activePathway} | ${gradeId}`;
    }
    selectedPathLabel.innerText = pathLabel;

    step1Content.classList.remove('active');
    step2Content.classList.add('active');

    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderBooks();
  }

  // Render Books for Step 2
  function renderBooks() {
    booksList.innerHTML = '';
    const query = searchInput.value.toLowerCase().trim();

    let filtered = rawBooksList;

    if (activeCategory === 'foundation') {
      if (activeCompany !== 'الكل') {
        filtered = filtered.filter(item => item.company === activeCompany && (item.stage === 'foundation' || item.grade === 'تأسيس'));
      } else {
        filtered = filtered.filter(item => item.stage === 'foundation' || item.grade === 'تأسيس');
      }
    } else {
      filtered = filtered.filter(item => item.grade === activeGrade && item.pathway === activePathway);
    }

    // Filter by search query
    if (query) {
      filtered = filtered.filter(item => {
        const subjMatch = item.subject && item.subject.toLowerCase().includes(query);
        const compMatch = item.company && item.company.toLowerCase().includes(query);
        const gradeMatch = item.grade && item.grade.toLowerCase().includes(query);
        return subjMatch || compMatch || gradeMatch;
      });
    }

    if (filtered.length === 0) {
      booksList.innerHTML = `
        <div class="no-books-found">
          <i data-lucide="book-x" style="width: 48px; height: 48px; color: var(--text-muted);"></i>
          <p>عذراً، لم نجد كتباً مطابقة لهذا الاختيار حالياً.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    filtered.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'book-item-btn';
      btn.innerHTML = `
        <div class="book-info-block">
          <span class="book-name-txt">${item.subject}</span>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 4px;">
            ${item.company ? `<span class="book-publisher-badge">${item.company}</span>` : ''}
            ${item.grade ? `<span class="book-publisher-badge" style="background: rgba(14, 165, 233, 0.12); color: #0284c7;">${item.grade}</span>` : ''}
          </div>
        </div>
        <div class="book-price-block">
          <span class="book-price-val">${item.price}</span>
          <span class="book-price-curr">جنيه</span>
        </div>
      `;

      btn.addEventListener('click', () => {
        selectBook(item);
      });

      booksList.appendChild(btn);
    });

    lucide.createIcons();
  }

  // Select Book and Show Price Receipt (Step 3)
  function selectBook(book) {
    activeBook = book;
    
    receiptPathway.innerText = book.pathway || 'عام';
    receiptGrade.innerText = book.grade || 'غير محدد';
    receiptPublisher.innerText = book.company || 'غير محدد';
    receiptBookName.innerText = book.subject;
    receiptPrice.innerText = book.price;

    // Build Pre-filled WhatsApp Message
    const message = `أهلاً مكتبة القاهرة 👋\nأود استفسار / طلب كتاب:\n📚 الكتاب/المادة: *${book.subject}*\n🏢 الناشر/الشركة: *${book.company || 'عام'}*\n🏫 المسار/القسم: *${book.pathway || 'عام'}*\n🎓 الصف: *${book.grade || 'تأسيس'}*\n💰 السعر المعتمد: *${book.price} جنيه مصري*\n\nيرجى تأكيد التوفر وشكراً!`;
    const encoded = encodeURIComponent(message);
    btnOrderWhatsapp.href = `https://wa.me/${WHATSAPP_PHONE}?text=${encoded}`;

    activeStep = 3;
    updateStepIndicators();

    step2Content.classList.remove('active');
    step3Content.classList.add('active');
  }

  // Update Progress Bar Steps
  function updateStepIndicators() {
    if (activeStep >= 1) stepInd1.classList.add('active');
    
    if (activeStep >= 2) {
      stepInd1.classList.add('completed');
      stepInd2.classList.add('active');
      stepLine1.classList.add('filled');
    } else {
      stepInd1.classList.remove('completed');
      stepInd2.classList.remove('active');
      stepLine1.classList.remove('filled');
    }

    if (activeStep >= 3) {
      stepInd2.classList.add('completed');
      stepInd3.classList.add('active');
      stepLine2.classList.add('filled');
    } else {
      stepInd2.classList.remove('completed');
      stepInd3.classList.remove('active');
      stepLine2.classList.remove('filled');
    }
  }

  // Search Listeners
  searchInput.addEventListener('input', () => {
    clearSearchBtn.style.display = searchInput.value.trim() ? 'flex' : 'none';
    renderBooks();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderBooks();
    searchInput.focus();
  });

  // Navigation Back Buttons
  document.getElementById('btn-back-to-1').addEventListener('click', () => {
    activeStep = 1;
    updateStepIndicators();
    step2Content.classList.remove('active');
    step1Content.classList.add('active');
  });

  document.getElementById('btn-back-to-2').addEventListener('click', () => {
    activeStep = 2;
    updateStepIndicators();
    step3Content.classList.remove('active');
    step2Content.classList.add('active');
  });

  // Restart Wizard Button
  document.getElementById('btn-restart-wizard').addEventListener('click', () => {
    activeBook = null;
    activeStep = 1;
    updateStepIndicators();
    step3Content.classList.remove('active');
    step1Content.classList.add('active');
    renderStep1Filters();
  });

  // Initial Load
  loadData();
});
