const sheets = require('./sheets');
const sessions = require('./sessions');
const whatsapp = require('./whatsapp');

async function handleIncomingMessage(incomingMessage) {
  // Extract details from WhatsApp webhook payload
  const contacts = incomingMessage.contacts;
  const messages = incomingMessage.messages;

  if (!messages || messages.length === 0) return;

  const msg = messages[0];
  const phone = msg.from;
  const session = sessions.getSession(phone);

  let inputType = msg.type;
  let inputText = '';
  let inputPayload = '';

  if (inputType === 'text') {
    inputText = msg.text.body ? msg.text.body.trim() : '';
  } else if (inputType === 'interactive') {
    const interactive = msg.interactive;
    if (interactive.type === 'button_reply') {
      inputText = interactive.button_reply.title;
      inputPayload = interactive.button_reply.id;
    } else if (interactive.type === 'list_reply') {
      inputText = interactive.list_reply.title;
      inputPayload = interactive.list_reply.id;
    }
  }

  try {
    // Global restart command or empty session reset
    if (inputText.toLowerCase() === 'reset' || inputText === 'ابدأ' || inputText === 'البداية') {
      sessions.clearSession(phone);
      return sendWelcomeMessage(phone);
    }

    // Route message based on current session step
    switch (session.step) {
      case 'WELCOME':
        return sendWelcomeMessage(phone);

      case 'SELECT_PHASE':
        if (inputPayload === 'phase_primary') {
          return sendGradesList(phone, 'primary');
        } else if (inputPayload === 'phase_secondary') {
          return sendGradesList(phone, 'secondary');
        } else {
          // If user sent text instead of button
          return sendWelcomeMessage(phone, "من فضلك اختر المرحلة من الأزرار بالأسفل 👇");
        }

      case 'SELECT_GRADE':
        if (inputPayload.startsWith('grade_')) {
          const gradeName = inputPayload.replace('grade_', '');
          sessions.updateSession(phone, {
            selectedGrade: gradeName,
            bookPage: 0,
            step: 'SELECT_BOOK'
          });
          return sendBooksList(phone, gradeName, 0);
        } else {
          return sendWelcomeMessage(phone, "حدث خطأ. لنبدأ من جديد 🔄");
        }

      case 'SELECT_BOOK':
        if (inputPayload.startsWith('book_')) {
          const bookIndex = parseInt(inputPayload.replace('book_', ''), 10);
          return showBookPrice(phone, session.selectedGrade, bookIndex);
        } else if (inputPayload.startsWith('next_page_')) {
          const nextPage = parseInt(inputPayload.replace('next_page_', ''), 10);
          sessions.updateSession(phone, { bookPage: nextPage });
          return sendBooksList(phone, session.selectedGrade, nextPage);
        } else if (inputPayload.startsWith('prev_page_')) {
          const prevPage = parseInt(inputPayload.replace('prev_page_', ''), 10);
          sessions.updateSession(phone, { bookPage: prevPage });
          return sendBooksList(phone, session.selectedGrade, prevPage);
        } else {
          // If they send text, offer reset
          return whatsapp.sendTextMessage(phone, "من فضلك اختر الكتاب من القائمة، أو اكتب 'ابدأ' للرجوع للرئيسية.");
        }

      case 'RESTART_PROMPT':
        if (inputPayload === 'restart_yes') {
          sessions.clearSession(phone);
          return sendWelcomeMessage(phone);
        } else if (inputPayload === 'restart_no') {
          await whatsapp.sendTextMessage(phone, "سعدنا بخدمتك! 🤍\nإذا أردت البحث عن كتب أخرى في أي وقت، فقط أرسل لي رسالة.");
          sessions.clearSession(phone);
          return;
        } else {
          return whatsapp.sendButtonsMessage(phone, "هل تريد البحث عن كتاب آخر؟", [
            { id: 'restart_yes', title: 'نعم 🔄' },
            { id: 'restart_no', title: 'لا، شكراً ❌' }
          ]);
        }

      default:
        sessions.clearSession(phone);
        return sendWelcomeMessage(phone);
    }
  } catch (error) {
    console.error('Error handling bot state:', error);
    await whatsapp.sendTextMessage(phone, "عذراً، حدث خطأ ما. يرجى كتابة 'ابدأ' لإعادة تشغيل البوت.");
  }
}

async function sendWelcomeMessage(phone, customText = null) {
  sessions.updateSession(phone, { step: 'SELECT_PHASE' });

  const text = customText || "أهلاً بك في مكتبة الكتب الدراسية 📚✨\n\nأنا هنا لمساعدتك في معرفة أسعار الكتب المتوفرة لدينا بسرعة.\n\nمن فضلك اختر المرحلة الدراسية:";
  const buttons = [
    { id: 'phase_primary', title: 'الابتدائي وكي جي 👶' },
    { id: 'phase_secondary', title: 'الإعدادي والثانوي 🎓' }
  ];

  return whatsapp.sendButtonsMessage(phone, text, buttons);
}

async function sendGradesList(phone, phase) {
  sessions.updateSession(phone, { step: 'SELECT_GRADE' });

  let grades = [];
  let title = '';

  if (phase === 'primary') {
    title = 'صفوف الابتدائي وكي جي';
    grades = ['كي جي 1', 'كي جي 2', '1 ابتدائي', '2 ابتدائي', '3 ابتدائي', '4 ابتدائي', '5 ابتدائي', '6 ابتدائي'];
  } else {
    title = 'صفوف الإعدادي والثانوي';
    grades = ['1 إعدادي', '2 إعدادي', '3 إعدادي', '1 ثانوي', '2 ثانوي', '3 ثانوي'];
  }

  const rows = grades.map(g => ({
    id: `grade_${g}`,
    title: g,
    description: `عرض الكتب المتاحة لصف ${g}`
  }));

  const sections = [{
    title: title,
    rows: rows
  }];

  return whatsapp.sendListMessage(
    phone,
    'الصفوف الدراسية',
    'اختر الصف الدراسي الذي تود معرفة أسعار كتبه:',
    'مكتبة الكتب الدراسية',
    'اختر الصف',
    sections
  );
}

async function sendBooksList(phone, gradeName, page = 0) {
  let data;
  try {
    data = await sheets.fetchSheetData();
  } catch (err) {
    await whatsapp.sendTextMessage(phone, "عذراً، نواجه مشكلة حالياً في قراءة البيانات من الشيت. يرجى المحاولة لاحقاً.");
    return;
  }

  const books = data[gradeName] || [];

  if (books.length === 0) {
    await whatsapp.sendTextMessage(phone, `عذراً، لا توجد كتب متوفرة بأسعارها حالياً لصف ${gradeName} ❌`);
    sessions.clearSession(phone);
    return sendWelcomeMessage(phone, "اختر مرحلة دراسية أخرى:");
  }

  const pageSize = 8;
  const totalPages = Math.ceil(books.length / pageSize);

  // Determine books slice
  const start = page * pageSize;
  const end = Math.min(start + pageSize, books.length);
  const pageBooks = books.slice(start, end);

  const rows = [];

  // Add "Previous" button if not on page 0
  if (page > 0) {
    rows.push({
      id: `prev_page_${page - 1}`,
      title: 'السابق ⬅️',
      description: `الرجوع للصفحة رقم ${page}`
    });
  }

  // Add Book rows
  pageBooks.forEach((book, idx) => {
    const actualIndex = start + idx;
    rows.push({
      id: `book_${actualIndex}`,
      title: book.name.substring(0, 24),
      description: `${book.price} جنيه`
    });
  });

  // Add "Next" button if there are more books
  if (end < books.length) {
    rows.push({
      id: `next_page_${page + 1}`,
      title: 'التالي ➡️',
      description: `عرض باقي الكتب (${books.length - end} كتاب متبقي)`
    });
  }

  const sections = [{
    title: `كتب ${gradeName} (صفحة ${page + 1}/${totalPages})`,
    rows: rows
  }];

  return whatsapp.sendListMessage(
    phone,
    `كتب ${gradeName}`,
    `اختر الكتاب لمعرفة سعره والتفاصيل (صفحة ${page + 1} من ${totalPages}):`,
    'مكتبة الكتب الدراسية',
    'اختر الكتاب',
    sections
  );
}

async function showBookPrice(phone, gradeName, bookIndex) {
  let data;
  try {
    data = await sheets.fetchSheetData();
  } catch (err) {
    await whatsapp.sendTextMessage(phone, "عذراً، نواجه مشكلة في قراءة البيانات.");
    return;
  }

  const books = data[gradeName] || [];
  const book = books[bookIndex];

  if (!book) {
    await whatsapp.sendTextMessage(phone, "عذراً، لم نجد الكتاب المطلوب.");
    sessions.clearSession(phone);
    return sendWelcomeMessage(phone);
  }

  sessions.updateSession(phone, { step: 'RESTART_PROMPT', selectedBook: book.name });

  const responseText = `📖 *تفاصيل الكتاب:*

🏫 الصف: *${gradeName}*
📘 الكتاب: *${book.name}*
💰 السعر: *${book.price} جنيه مصري* ✅

✨ متوفر حالياً بالمكتبة.`;

  await whatsapp.sendTextMessage(phone, responseText);

  // Ask if they want to check another book
  return whatsapp.sendButtonsMessage(
    phone,
    "هل تريد البحث عن كتاب آخر؟",
    [
      { id: 'restart_yes', title: 'نعم 🔄' },
      { id: 'restart_no', title: 'لا، شكراً ❌' }
    ]
  );
}

module.exports = {
  handleIncomingMessage
};
