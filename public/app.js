// Main Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // Config
  const WHATSAPP_PHONE = '201012123955'; // Country code +20 for Egypt + 1012123955
  
  // App State
  let bookData = {}; 
  let currentStage = 'primary'; 
  let selectedGrade = '';
  let selectedBook = null;
  let activeStep = 1;

  // DOM Elements
  const gradesGrid = document.getElementById('grades-grid');
  const booksList = document.getElementById('books-list');
  const searchInput = document.getElementById('book-search');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const selectedGradeLabel = document.getElementById('selected-grade-label');
  
  // Steps Content
  const step1Content = document.getElementById('step-1-content');
  const step2Content = document.getElementById('step-2-content');
  const step3Content = document.getElementById('step-3-content');
  
  // Step Indicators
  const stepInd1 = document.getElementById('step-ind-1');
  const stepInd2 = document.getElementById('step-ind-2');
  const stepInd3 = document.getElementById('step-ind-3');
  const stepLine1 = document.getElementById('step-line-1');
  const stepLine2 = document.getElementById('step-line-2');

  // Receipt Elements
  const receiptGrade = document.getElementById('receipt-grade');
  const receiptBookName = document.getElementById('receipt-book-name');
  const receiptPublisher = document.getElementById('receipt-publisher');
  const receiptPrice = document.getElementById('receipt-price');
  const btnOrderWhatsapp = document.getElementById('btn-order-whatsapp');

  // Fetch Data from Server API
  async function loadBooksData() {
    try {
      const response = await fetch('/api/books');
      if (!response.ok) throw new Error('فشل جلب البيانات من السيرفر');
      bookData = await response.json();
      renderGrades();
    } catch (error) {
      console.error(error);
      gradesGrid.innerHTML = `
        <div class="loading-spinner">
          <i data-lucide="alert-triangle" style="color: var(--primary); width: 48px; height: 48px;"></i>
          <p style="color: var(--primary); font-weight: 700; font-size: 1.1rem;">حدث خطأ في تحميل البيانات!</p>
          <p style="color: var(--text-muted); font-size: 0.9rem; text-align: center;">يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.</p>
        </div>
      `;
      lucide.createIcons();
    }
  }

  // Define Grade List by Stage (Arabic/UI Mapping)
  const gradesByStage = {
    primary: [
      { id: 'كي جي 1', icon: 'baby' },
      { id: 'كي جي 2', icon: 'baby' },
      { id: '1 ابتدائي', icon: 'sparkles' },
      { id: '2 ابتدائي', icon: 'sparkles' },
      { id: '3 ابتدائي', icon: 'sparkles' },
      { id: '4 ابتدائي', icon: 'sparkles' },
      { id: '5 ابتدائي', icon: 'sparkles' },
      { id: '6 ابتدائي', icon: 'sparkles' }
    ],
    secondary: [
      { id: '1 إعدادي', icon: 'book' },
      { id: '2 إعدادي', icon: 'book' },
      { id: '3 إعدادي', icon: 'book' },
      { id: '1 ثانوي', icon: 'award' },
      { id: '2 ثانوي', icon: 'award' },
      { id: '3 ثانوي', icon: 'award' }
    ]
  };

  // Render Grade Selection Buttons
  function renderGrades() {
    gradesGrid.innerHTML = '';
    const grades = gradesByStage[currentStage];

    grades.forEach(grade => {
      // Check if grade actually has books in sheet data
      const booksCount = bookData[grade.id] ? bookData[grade.id].length : 0;
      
      const btn = document.createElement('button');
      btn.className = 'grade-btn';
      // Disable if no books found in spreadsheet data
      if (booksCount === 0) {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }
      
      btn.innerHTML = `
        <i data-lucide="${grade.icon}" class="grade-icon"></i>
        <span>${grade.id}</span>
      `;
      
      btn.addEventListener('click', () => {
        if (booksCount > 0) {
          selectGrade(grade.id);
        }
      });
      gradesGrid.appendChild(btn);
    });

    lucide.createIcons();
  }

  // Switch Stage Tab (Primary / Secondary)
  document.querySelectorAll('.stage-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetTab = e.currentTarget;
      document.querySelectorAll('.stage-tab').forEach(t => t.classList.remove('active'));
      targetTab.classList.add('active');
      currentStage = targetTab.dataset.stage;
      renderGrades();
    });
  });

  // Flow State Transitions
  function updateStepIndicators() {
    // Step 1
    if (activeStep >= 1) {
      stepInd1.classList.add('active');
    }
    
    // Step 2
    if (activeStep >= 2) {
      stepInd1.classList.add('completed');
      stepInd2.classList.add('active');
      stepLine1.classList.add('filled');
    } else {
      stepInd1.classList.remove('completed');
      stepInd2.classList.remove('active');
      stepLine1.classList.remove('filled');
    }

    // Step 3
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

  function selectGrade(gradeId) {
    selectedGrade = gradeId;
    selectedGradeLabel.innerText = selectedGrade;
    
    activeStep = 2;
    updateStepIndicators();
    
    step1Content.classList.remove('active');
    step2Content.classList.add('active');
    
    // Reset search and populate books
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderBooks();
  }

  // Render Books for Selected Grade with Search Filters
  function renderBooks() {
    booksList.innerHTML = '';
    const query = searchInput.value.toLowerCase().trim();
    const books = bookData[selectedGrade] || [];
    
    // Filter books based on search term
    const filteredBooks = books.filter(book => {
      const nameMatch = book.name.toLowerCase().includes(query);
      const pubMatch = book.publisher && book.publisher.toLowerCase().includes(query);
      return nameMatch || pubMatch;
    });

    if (filteredBooks.length === 0) {
      booksList.innerHTML = `
        <div class="no-books-found">
          <i data-lucide="book-x" style="width: 42px; height: 42px; margin-bottom: 0.5rem; color: var(--text-muted);"></i>
          <p>عذراً، لم نجد كتب مطابقة لبحثك.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    filteredBooks.forEach(book => {
      const btn = document.createElement('button');
      btn.className = 'book-item-btn';
      btn.innerHTML = `
        <div class="book-info-block">
          <span class="book-name-txt">${book.rawName}</span>
          ${book.publisher ? `<span class="book-publisher-badge">${book.publisher}</span>` : ''}
        </div>
        <div class="book-price-block">
          <span class="book-price-val">${book.price}</span>
          <span class="book-price-curr">جنيه</span>
        </div>
      `;

      btn.addEventListener('click', () => {
        selectBook(book);
      });

      booksList.appendChild(btn);
    });

    lucide.createIcons();
  }

  // Select Book and Show Price Receipt
  function selectBook(book) {
    selectedBook = book;
    
    receiptGrade.innerText = selectedGrade;
    receiptBookName.innerText = book.rawName;
    receiptPublisher.innerText = book.publisher || 'غير محدد';
    receiptPrice.innerText = book.price;

    // Pre-fill WhatsApp URL link with URI encoded message
    const message = `أهلاً مكتبة الكتب الدراسية 👋\nأود طلب كتاب:\n📚 *${book.rawName}*\n🏢 الناشر: *${book.publisher || 'غير محدد'}*\n🏫 الصف: *${selectedGrade}*\n💰 السعر المعتمد: *${book.price} جنيه مصري*\n\nيرجى تأكيد توفره لإتمام عملية الشراء وشكراً!`;
    const encodedMessage = encodeURIComponent(message);
    btnOrderWhatsapp.href = `https://wa.me/${WHATSAPP_PHONE}?text=${encodedMessage}`;

    activeStep = 3;
    updateStepIndicators();

    step2Content.classList.remove('active');
    step3Content.classList.add('active');
  }

  // Search Input Actions
  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim().length > 0) {
      clearSearchBtn.style.display = 'flex';
    } else {
      clearSearchBtn.style.display = 'none';
    }
    renderBooks();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderBooks();
    searchInput.focus();
  });

  // Back Actions
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

  // Reset Wizard
  document.getElementById('btn-restart-wizard').addEventListener('click', () => {
    selectedBook = null;
    selectedGrade = '';
    activeStep = 1;
    updateStepIndicators();
    
    step3Content.classList.remove('active');
    step1Content.classList.add('active');
    
    renderGrades();
  });

  // Initialize
  loadBooksData();
  lucide.createIcons();
});
