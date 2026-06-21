/* ============================================================
   LuxeCut — Main Site JavaScript  (app.js)
   All functions used by index.html are defined here.
   ============================================================ */

'use strict';

// ─────────────────────────────────────────
//  DATA STORE
// ─────────────────────────────────────────
var servicesData = [];
var barbersData  = [];

var timeSlotsData = [
  { id: 'slot-1',  time: '09:00 AM', period: 'morning'   },
  { id: 'slot-2',  time: '10:00 AM', period: 'morning'   },
  { id: 'slot-3',  time: '11:00 AM', period: 'morning'   },
  { id: 'slot-4',  time: '12:00 PM', period: 'afternoon' },
  { id: 'slot-5',  time: '01:00 PM', period: 'afternoon' },
  { id: 'slot-6',  time: '02:00 PM', period: 'afternoon' },
  { id: 'slot-7',  time: '03:00 PM', period: 'afternoon' },
  { id: 'slot-8',  time: '04:00 PM', period: 'afternoon' },
  { id: 'slot-9',  time: '05:00 PM', period: 'evening'   },
  { id: 'slot-10', time: '06:00 PM', period: 'evening'   },
  { id: 'slot-11', time: '07:00 PM', period: 'evening'   }
];

// ─────────────────────────────────────────
//  BOOKING STATE
// ─────────────────────────────────────────
var bookingState = {
  selectedServices: [],
  selectedBarber:   null,
  selectedDate:     null,
  selectedTime:     null,
  clientDetails:    { name: '', email: '', phone: '', notes: '' },
  paymentMethod:    'card',
  confirmationId:   null,
  currentStep:      1
};

var currentCalendarDate = new Date();

// ─────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
});

async function initializeApp() {
  // Sticky header on scroll
  window.addEventListener('scroll', function () {
    var header = document.getElementById('main-header');
    if (!header) return;
    if (window.scrollY > 50) { header.classList.add('scrolled'); }
    else                     { header.classList.remove('scrolled'); }
  });

  // Load data from API
  await loadInitialData();

  // Render catalog sections
  renderServicesCatalog('all');
  renderBarbersCatalog();

  // Render wizard elements
  renderWizardServices();
  renderWizardBarbers();
  renderCalendar();
  updateOrderSummary();

  // Service filter buttons
  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
      e.currentTarget.classList.add('active');
      renderServicesCatalog(e.currentTarget.dataset.filter);
    });
  });

  // Payment method selection
  document.querySelectorAll('.payment-card').forEach(function (card) {
    card.addEventListener('click', function (e) {
      document.querySelectorAll('.payment-card').forEach(function (c) { c.classList.remove('selected'); });
      e.currentTarget.classList.add('selected');
      var method = e.currentTarget.dataset.method;
      bookingState.paymentMethod = method;
      var cardFields = document.getElementById('card-payment-details');
      if (cardFields) {
        cardFields.style.display = (method === 'card') ? 'flex' : 'none';
      }
    });
  });

  // Format card number input with spaces
  var cardNumInput = document.getElementById('card-num');
  if (cardNumInput) {
    cardNumInput.addEventListener('input', function (e) {
      var val = e.target.value.replace(/\D/g, '').substring(0, 16);
      e.target.value = val.replace(/(.{4})/g, '$1 ').trim();
    });
  }

  // Format expiry MM/YY
  var cardExpiry = document.getElementById('card-expiry');
  if (cardExpiry) {
    cardExpiry.addEventListener('input', function (e) {
      var val = e.target.value.replace(/\D/g, '').substring(0, 4);
      if (val.length >= 3) { val = val.substring(0,2) + '/' + val.substring(2); }
      e.target.value = val;
    });
  }
}

// ─────────────────────────────────────────
//  API: LOAD DATA
// ─────────────────────────────────────────
async function loadInitialData() {
  try {
    var responses = await Promise.all([
      fetch('/api/services'),
      fetch('/api/barbers')
    ]);

    if (!responses[0].ok || !responses[1].ok) {
      throw new Error('API returned an error status.');
    }

    servicesData = await responses[0].json();
    barbersData  = await responses[1].json();

    // Ensure arrays
    if (!Array.isArray(servicesData)) servicesData = [];
    if (!Array.isArray(barbersData))  barbersData  = [];

  } catch (err) {
    console.error('[LuxeCut] Failed to load data:', err);
    showApiError();
  }
}

function showApiError() {
  var svcEl = document.getElementById('catalog-services-container');
  var brbEl = document.getElementById('catalog-barbers-container');
  var msg   = '<div style="text-align:center;padding:40px;color:#8a8a93"><i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;color:#e05050;margin-bottom:12px;display:block"></i><p>Could not connect to the server.<br>Please make sure <strong>node server.js</strong> is running.</p></div>';
  if (svcEl) svcEl.innerHTML = msg;
  if (brbEl) brbEl.innerHTML = msg;
}

// ─────────────────────────────────────────
//  RENDER: SERVICES CATALOG
// ─────────────────────────────────────────
function renderServicesCatalog(filter) {
  filter = filter || 'all';
  var container = document.getElementById('catalog-services-container');
  if (!container) return;

  container.innerHTML = '';
  var filtered = servicesData.filter(function (s) { return filter === 'all' || s.category === filter; });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#8a8a93"><i class="fa-solid fa-scissors" style="font-size:2rem;opacity:.3;display:block;margin-bottom:12px"></i><p>No services in this category yet.</p></div>';
    return;
  }

  filtered.forEach(function (service) {
    var isSelected = bookingState.selectedServices.some(function (s) { return s.id === service.id; });
    var card = document.createElement('div');
    card.className = 'service-card' + (isSelected ? ' selected' : '');
    card.id = 'catalog-service-' + service.id;
    card.innerHTML =
      '<div>' +
        '<div class="service-header">' +
          '<h3 class="service-title">' + escHtml(service.name) + '</h3>' +
          '<span class="service-price">$' + service.price + '</span>' +
        '</div>' +
        '<p class="service-desc">' + escHtml(service.desc || '') + '</p>' +
      '</div>' +
      '<div class="service-footer">' +
        '<span class="service-duration"><i class="fa-regular fa-clock"></i> ' + escHtml(service.duration) + '</span>' +
        '<button class="service-select-btn" onclick="toggleServiceSelection(\'' + service.id + '\')">' +
          (isSelected ? '<i class="fa-solid fa-check"></i> Selected' : 'Select Service') +
        '</button>' +
      '</div>';
    container.appendChild(card);
  });
}

// ─────────────────────────────────────────
//  RENDER: BARBERS CATALOG
// ─────────────────────────────────────────
function renderBarbersCatalog() {
  var container = document.getElementById('catalog-barbers-container');
  if (!container) return;

  container.innerHTML = '';

  if (barbersData.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#8a8a93"><i class="fa-solid fa-user-tie" style="font-size:2rem;opacity:.3;display:block;margin-bottom:12px"></i><p>No stylists listed yet.</p></div>';
    return;
  }

  barbersData.forEach(function (barber) {
    var card = document.createElement('div');
    card.className = 'barber-card';
    card.innerHTML =
      '<div class="barber-image-container">' +
        '<img src="' + barber.image + '" alt="' + escHtml(barber.name) + '" onerror="this.src=\'' + genAvatar(barber.name) + '\'">' +
        '<div class="barber-status' + (barber.available ? ' available' : '') + '">' +
          (barber.available ? 'Available' : 'Booked') +
        '</div>' +
      '</div>' +
      '<div class="barber-info">' +
        '<span class="barber-specialty">' + escHtml(barber.specialty) + '</span>' +
        '<h3 class="barber-name">' + escHtml(barber.name) + '</h3>' +
        '<div class="barber-rating">' +
          '<i class="fa-solid fa-star"></i>' +
          '<span>' + barber.rating + ' (' + barber.reviews + ' reviews)</span>' +
        '</div>' +
        '<button class="barber-select-btn" onclick="quickSelectBarber(\'' + barber.id + '\')">Choose Stylist</button>' +
      '</div>';
    container.appendChild(card);
  });
}

// ─────────────────────────────────────────
//  RENDER: WIZARD — SERVICES (Step 1)
// ─────────────────────────────────────────
function renderWizardServices() {
  var container = document.getElementById('wizard-services-container');
  if (!container) return;

  container.innerHTML = '';

  if (servicesData.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);padding:20px">No services available yet. Add them in the Admin Panel.</p>';
    return;
  }

  servicesData.forEach(function (service) {
    var isSelected = bookingState.selectedServices.some(function (s) { return s.id === service.id; });
    var card = document.createElement('div');
    card.className = 'service-card' + (isSelected ? ' selected' : '');
    card.id = 'wizard-service-' + service.id;
    card.style.cursor = 'pointer';
    card.onclick = function () { toggleServiceSelection(service.id); };
    card.innerHTML =
      '<div>' +
        '<div class="service-header">' +
          '<h3 class="service-title">' + escHtml(service.name) + '</h3>' +
          '<span class="service-price">$' + service.price + '</span>' +
        '</div>' +
        '<p class="service-desc" style="font-size:.85rem;margin-bottom:15px">' + escHtml(service.desc || '') + '</p>' +
      '</div>' +
      '<div class="service-footer" style="padding-top:15px">' +
        '<span class="service-duration"><i class="fa-regular fa-clock"></i> ' + escHtml(service.duration) + '</span>' +
        '<span class="service-select-btn" style="pointer-events:none">' +
          (isSelected ? '<i class="fa-solid fa-check"></i> Added' : 'Add Treatment') +
        '</span>' +
      '</div>';
    container.appendChild(card);
  });
}

// ─────────────────────────────────────────
//  RENDER: WIZARD — BARBERS (Step 2)
// ─────────────────────────────────────────
function renderWizardBarbers() {
  var container = document.getElementById('wizard-barbers-container');
  if (!container) return;

  container.innerHTML = '';

  if (barbersData.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);padding:20px">No stylists available yet. Add them in the Admin Panel.</p>';
    return;
  }

  barbersData.forEach(function (barber) {
    var isSelected = bookingState.selectedBarber && bookingState.selectedBarber.id === barber.id;
    var card = document.createElement('div');
    card.className = 'wizard-barber-card' + (isSelected ? ' selected' : '');
    card.onclick = function () { selectBarber(barber.id); };
    card.innerHTML =
      '<div class="wizard-barber-avatar">' +
        '<img src="' + barber.image + '" alt="' + escHtml(barber.name) + '" onerror="this.src=\'' + genAvatar(barber.name) + '\'">' +
      '</div>' +
      '<h4 class="wizard-barber-name">' + escHtml(barber.name) + '</h4>' +
      '<span class="wizard-barber-role">' + escHtml((barber.specialty || '').split('&')[0]) + '</span>' +
      '<div class="barber-rating" style="margin-bottom:0;margin-top:8px;font-size:.8rem">' +
        '<i class="fa-solid fa-star"></i><span>' + barber.rating + '</span>' +
      '</div>';
    container.appendChild(card);
  });
}

// ─────────────────────────────────────────
//  INTERACTIONS: SERVICE TOGGLE
// ─────────────────────────────────────────
function toggleServiceSelection(serviceId) {
  var service = servicesData.find(function (s) { return s.id === serviceId; });
  if (!service) return;

  var idx = bookingState.selectedServices.findIndex(function (s) { return s.id === serviceId; });
  if (idx > -1) {
    bookingState.selectedServices.splice(idx, 1);
  } else {
    bookingState.selectedServices.push(service);
  }

  renderServicesCatalog(getActiveFilter());
  renderWizardServices();
  updateOrderSummary();
  validateStepState();
}

function getActiveFilter() {
  var activeBtn = document.querySelector('.filter-btn.active');
  return activeBtn ? (activeBtn.dataset.filter || 'all') : 'all';
}

// ─────────────────────────────────────────
//  INTERACTIONS: BARBER SELECT
// ─────────────────────────────────────────
function selectBarber(barberId) {
  var barber = barbersData.find(function (b) { return b.id === barberId; });
  if (!barber) return;
  bookingState.selectedBarber = barber;
  renderWizardBarbers();
  updateOrderSummary();
  validateStepState();
}

function quickSelectBarber(barberId) {
  selectBarber(barberId);
  var bookingSection = document.getElementById('booking');
  if (bookingSection) { bookingSection.scrollIntoView({ behavior: 'smooth' }); }
}

// ─────────────────────────────────────────
//  ORDER SUMMARY (Step 4 sidebar)
// ─────────────────────────────────────────
function updateOrderSummary() {
  var subtotalEl  = document.getElementById('summary-subtotal');
  var taxEl       = document.getElementById('summary-tax');
  var totalEl     = document.getElementById('summary-total');
  var listEl      = document.getElementById('summary-services-container');
  var stylistEl   = document.getElementById('summary-stylist-name');
  var scheduleEl  = document.getElementById('summary-schedule-time');

  if (!subtotalEl) return;

  listEl.innerHTML = '';
  var subtotal = 0;

  if (bookingState.selectedServices.length === 0) {
    listEl.innerHTML = '<span style="color:var(--text-muted);font-style:italic;font-size:.85rem">No treatment selected</span>';
  } else {
    bookingState.selectedServices.forEach(function (s) {
      subtotal += parseFloat(s.price) || 0;
      var item = document.createElement('div');
      item.className = 'summary-service-item';
      item.innerHTML = '<span>' + escHtml(s.name) + '</span><span>$' + (parseFloat(s.price) || 0).toFixed(2) + '</span>';
      listEl.appendChild(item);
    });
  }

  var tax   = subtotal * 0.08;
  var total = subtotal + tax;

  subtotalEl.textContent = '$' + subtotal.toFixed(2);
  taxEl.textContent      = '$' + tax.toFixed(2);
  totalEl.textContent    = '$' + total.toFixed(2);

  stylistEl.textContent  = bookingState.selectedBarber ? bookingState.selectedBarber.name : '—';

  if (bookingState.selectedDate && bookingState.selectedTime) {
    var opts    = { month: 'short', day: 'numeric', year: 'numeric' };
    var dateStr = bookingState.selectedDate.toLocaleDateString('en-US', opts);
    scheduleEl.textContent = dateStr + ' @ ' + bookingState.selectedTime;
  } else {
    scheduleEl.textContent = '—';
  }
}

// ─────────────────────────────────────────
//  CALENDAR
// ─────────────────────────────────────────
var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function renderCalendar() {
  var titleEl = document.getElementById('calendar-month-year');
  var daysEl  = document.getElementById('calendar-days-grid');
  if (!titleEl || !daysEl) return;

  var year  = currentCalendarDate.getFullYear();
  var month = currentCalendarDate.getMonth();

  titleEl.textContent = MONTH_NAMES[month] + ' ' + year;
  daysEl.innerHTML    = '';

  var firstDay  = new Date(year, month, 1).getDay();
  var totalDays = new Date(year, month + 1, 0).getDate();
  var today     = new Date(); today.setHours(0,0,0,0);

  // Padding blanks
  for (var p = 0; p < firstDay; p++) {
    var blank = document.createElement('div');
    blank.className = 'calendar-day disabled';
    daysEl.appendChild(blank);
  }

  // Day cells
  for (var d = 1; d <= totalDays; d++) {
    var dayDate = new Date(year, month, d);
    var cell    = document.createElement('div');
    cell.className  = 'calendar-day';
    cell.textContent = d;

    if (dayDate < today) {
      cell.classList.add('disabled');
    } else {
      if (dayDate.getTime() === today.getTime()) { cell.classList.add('today'); }
      if (bookingState.selectedDate && dayDate.getTime() === bookingState.selectedDate.getTime()) {
        cell.classList.add('selected');
      }
      (function (dd) {
        cell.onclick = function () { selectDate(dd); };
      }(dayDate));
    }

    daysEl.appendChild(cell);
  }
}

function changeMonth(dir) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + dir);
  renderCalendar();
}

function selectDate(date) {
  bookingState.selectedDate = date;
  bookingState.selectedTime = null;
  renderCalendar();
  renderTimeSlots();
  updateOrderSummary();
  validateStepState();
}

// ─────────────────────────────────────────
//  TIME SLOTS
// ─────────────────────────────────────────
function renderTimeSlots() {
  var container = document.getElementById('time-slots-container');
  if (!container) return;

  container.innerHTML = '';

  if (!bookingState.selectedDate) {
    container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);font-size:.9rem">Select a date to view available time slots.</p>';
    return;
  }

  timeSlotsData.forEach(function (slot) {
    var seed     = bookingState.selectedDate.getDate() + parseInt(slot.id.split('-')[1], 10);
    var isBooked = (seed % 3 === 0);
    var isSel    = bookingState.selectedTime === slot.time;

    var el = document.createElement('div');
    el.className  = 'time-slot' + (isBooked ? ' disabled' : '') + (isSel ? ' selected' : '');
    el.textContent = slot.time;

    if (!isBooked) {
      (function (t) {
        el.onclick = function () { selectTime(t); };
      }(slot.time));
    }

    container.appendChild(el);
  });

  updateDateTimePreview();
}

function selectTime(time) {
  bookingState.selectedTime = time;
  renderTimeSlots();
  updateOrderSummary();
  validateStepState();
}

function updateDateTimePreview() {
  var el = document.getElementById('selected-datetime-preview');
  if (!el) return;
  if (bookingState.selectedDate && bookingState.selectedTime) {
    var opts = { weekday: 'short', month: 'short', day: 'numeric' };
    el.innerHTML = '<i class="fa-solid fa-circle-check"></i> Chosen: ' +
      bookingState.selectedDate.toLocaleDateString('en-US', opts) +
      ' at ' + bookingState.selectedTime;
  } else {
    el.textContent = 'No slot selected';
  }
}

// ─────────────────────────────────────────
//  WIZARD NAVIGATION
// ─────────────────────────────────────────
async function navigateWizard(direction) {
  var nextStep = bookingState.currentStep + direction;
  if (nextStep < 1 || nextStep > 5) return;

  if (direction === 1) {
    if (!validateStep(bookingState.currentStep)) return;
    if (bookingState.currentStep === 4) {
      var saved = await submitBooking();
      if (!saved) return;
    }
  }

  bookingState.currentStep = nextStep;

  // Show correct step panel
  document.querySelectorAll('.wizard-step').forEach(function (p) { p.classList.remove('active'); });
  var panel = document.getElementById('step-panel-' + bookingState.currentStep);
  if (panel) panel.classList.add('active');

  // Update progress indicators
  document.querySelectorAll('.progress-step').forEach(function (step) {
    var n = parseInt(step.dataset.step, 10);
    step.classList.remove('active', 'completed');
    if (n === bookingState.currentStep)  { step.classList.add('active'); }
    if (n < bookingState.currentStep)    { step.classList.add('completed'); }
  });

  // Progress bar fill
  var pct = ((bookingState.currentStep - 1) / 4) * 100;
  var bar = document.getElementById('wizard-progress-bar');
  if (bar) bar.style.width = pct + '%';

  // Button states
  var prevBtn = document.getElementById('prev-step-btn');
  var nextBtn = document.getElementById('next-step-btn');

  if (prevBtn) {
    if (bookingState.currentStep === 1 || bookingState.currentStep === 5) {
      prevBtn.disabled = true; prevBtn.classList.add('btn-disabled');
    } else {
      prevBtn.disabled = false; prevBtn.classList.remove('btn-disabled');
    }
  }

  if (nextBtn) {
    if (bookingState.currentStep === 5) {
      var footer = document.getElementById('wizard-navigation-footer');
      if (footer) footer.style.display = 'none';
      generateReceipt();
    } else if (bookingState.currentStep === 4) {
      nextBtn.innerHTML = 'Confirm Booking <i class="fa-solid fa-square-check"></i>';
    } else {
      nextBtn.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';
    }
  }

  // Scroll wizard into view on mobile
  var wizard = document.querySelector('.booking-wizard');
  if (wizard) { wizard.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  validateStepState();
}

// ─────────────────────────────────────────
//  STEP VALIDATION
// ─────────────────────────────────────────
function validateStep(step) {
  if (step === 1) {
    if (bookingState.selectedServices.length === 0) {
      alert('Please select at least one treatment before continuing.');
      return false;
    }
  } else if (step === 2) {
    if (!bookingState.selectedBarber) {
      alert('Please select a stylist / barber.');
      return false;
    }
  } else if (step === 3) {
    if (!bookingState.selectedDate || !bookingState.selectedTime) {
      alert('Please choose an available date and time slot.');
      return false;
    }
  } else if (step === 4) {
    var nameEl  = document.getElementById('client-name');
    var emailEl = document.getElementById('client-email');
    var phoneEl = document.getElementById('client-phone');

    if (!nameEl.value.trim() || !emailEl.value.trim() || !phoneEl.value.trim()) {
      alert('Please fill out all required contact fields (Name, Email, Phone).');
      return false;
    }

    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailEl.value.trim())) {
      alert('Please enter a valid email address.');
      return false;
    }

    if (bookingState.paymentMethod === 'card') {
      var cardNum    = document.getElementById('card-num').value.replace(/\s/g,'');
      var cardExpiry = document.getElementById('card-expiry').value.trim();
      var cardCvc    = document.getElementById('card-cvc').value.trim();
      if (cardNum.length < 12 || !cardExpiry || cardCvc.length < 3) {
        alert('Please provide valid credit card payment details.');
        return false;
      }
    }

    // Save to state
    bookingState.clientDetails.name  = nameEl.value.trim();
    bookingState.clientDetails.email = emailEl.value.trim();
    bookingState.clientDetails.phone = phoneEl.value.trim();
    bookingState.clientDetails.notes = (document.getElementById('client-notes').value || '').trim();
  }
  return true;
}

function validateStepState() {
  var nextBtn = document.getElementById('next-step-btn');
  if (!nextBtn) return;

  var valid = false;
  if (bookingState.currentStep === 1) { valid = bookingState.selectedServices.length > 0; }
  else if (bookingState.currentStep === 2) { valid = !!bookingState.selectedBarber; }
  else if (bookingState.currentStep === 3) { valid = !!(bookingState.selectedDate && bookingState.selectedTime); }
  else { valid = true; }

  if (valid) { nextBtn.classList.remove('btn-disabled'); }
  else       { nextBtn.classList.add('btn-disabled'); }
}

// ─────────────────────────────────────────
//  SUBMIT BOOKING
// ─────────────────────────────────────────
async function submitBooking() {
  var payload = {
    services:      bookingState.selectedServices.map(function (s) { return s.id; }),
    barberId:      bookingState.selectedBarber.id,
    date:          bookingState.selectedDate.toISOString(),
    time:          bookingState.selectedTime,
    clientDetails: bookingState.clientDetails,
    paymentMethod: bookingState.paymentMethod
  };

  try {
    var res = await fetch('/api/bookings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      throw new Error(err.message || 'Server returned ' + res.status);
    }

    var result = await res.json();
    bookingState.confirmationId = result.bookingId;
    return true;

  } catch (e) {
    console.error('[LuxeCut] Booking submission failed:', e);
    alert('Could not save your booking. Please check the server is running and try again.');
    return false;
  }
}

// ─────────────────────────────────────────
//  RECEIPT (Step 5)
// ─────────────────────────────────────────
function generateReceipt() {
  var id = bookingState.confirmationId || ('LXC-' + Math.floor(1000 + Math.random() * 9000) + '-' + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + Math.floor(Math.random() * 10));

  var idEl      = document.getElementById('receipt-booking-id');
  var clientEl  = document.getElementById('receipt-client-name');
  var stylistEl = document.getElementById('receipt-stylist-name');
  var dateEl    = document.getElementById('receipt-date');
  var timeEl    = document.getElementById('receipt-time');
  var listEl    = document.getElementById('receipt-services-list');

  if (idEl)      idEl.textContent      = 'ID: #' + id;
  if (clientEl)  clientEl.textContent  = bookingState.clientDetails.name  || '—';
  if (stylistEl) stylistEl.textContent = bookingState.selectedBarber ? bookingState.selectedBarber.name : '—';

  if (dateEl && bookingState.selectedDate) {
    dateEl.textContent = bookingState.selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  if (timeEl) timeEl.textContent = bookingState.selectedTime || '—';

  if (listEl) {
    listEl.innerHTML = '';
    var subtotal = 0;
    bookingState.selectedServices.forEach(function (s) {
      subtotal += parseFloat(s.price) || 0;
      var row = document.createElement('div');
      row.className = 'receipt-service-row';
      row.innerHTML = '<span>' + escHtml(s.name) + '</span><span>$' + (parseFloat(s.price) || 0).toFixed(2) + '</span>';
      listEl.appendChild(row);
    });

    var total    = subtotal * 1.08;
    var totalRow = document.createElement('div');
    totalRow.className = 'receipt-service-row total';
    totalRow.innerHTML = '<span>Total (' + (bookingState.paymentMethod === 'salon' ? 'Pay at Salon' : 'Paid') + ')</span><span>$' + total.toFixed(2) + '</span>';
    listEl.appendChild(totalRow);
  }
}

// ─────────────────────────────────────────
//  MAP INTERACTION
// ─────────────────────────────────────────
function interactMap() {
  var el = document.getElementById('map-popup-text');
  if (!el) return;
  el.innerHTML = '<i class="fa-solid fa-location-arrow fa-spin"></i> Loading directions...';
  setTimeout(function () {
    el.textContent = 'Directions ready! 4.2 miles (12 min)';
  }, 1500);
}

// ─────────────────────────────────────────
//  MOBILE MENU
// ─────────────────────────────────────────
function toggleMobileMenu() {
  var navLinks = document.getElementById('nav-links');
  var header   = document.getElementById('main-header');
  if (!navLinks) return;

  var isOpen = navLinks.classList.contains('mobile-open');
  if (isOpen) {
    navLinks.classList.remove('mobile-open');
    navLinks.style.cssText = '';
  } else {
    navLinks.classList.add('mobile-open');
    navLinks.style.display        = 'flex';
    navLinks.style.flexDirection  = 'column';
    navLinks.style.position       = 'absolute';
    navLinks.style.top            = '80px';
    navLinks.style.left           = '0';
    navLinks.style.width          = '100%';
    navLinks.style.background     = 'var(--bg-main)';
    navLinks.style.padding        = '20px';
    navLinks.style.borderBottom   = '1px solid var(--border-color)';
    navLinks.style.gap            = '20px';
    navLinks.style.zIndex         = '99';
  }
}

// ─────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function genAvatar(name) {
  var initials = (name || '?').split(' ').map(function (n) { return n[0] || ''; }).join('').toUpperCase().substring(0, 2);
  return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(initials) + '&background=1e1e24&color=d4af37&size=200&bold=true';
}
