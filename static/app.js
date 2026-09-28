// Quotex Trading Platform - JavaScript

// متغيرات عامة
let isLoggedIn = false;
let updateInterval = null;

// بدء التطبيق
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkLoginStatus();
});

// إعداد مستمعي الأحداث
function setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    const tradeForm = document.getElementById('trade-form');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (tradeForm) {
        tradeForm.addEventListener('submit', handleTrade);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// فحص حالة تسجيل الدخول
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/status');
        if (response.ok) {
            const data = await response.json();
            showDashboard();
            updateDashboard(data);
            startAutoUpdate();
        }
    } catch (error) {
        showLoginPage();
    }
}

// معالجة تسجيل الدخول
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const mode = document.getElementById('mode').value;
    
    if (!email || !password) {
        showError('login-error', 'البريد والكلمة مطلوبان');
        return;
    }
    
    showToast('جاري الاتصال...', 'info');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, mode })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('✅ تم الاتصال بنجاح!', 'success');
            showDashboard();
            document.getElementById('user-email').textContent = email;
            updateDashboard(data);
            startAutoUpdate();
        } else {
            showError('login-error', data.message || 'فشل الاتصال');
            showToast('❌ ' + (data.message || 'فشل الاتصال'), 'error');
        }
    } catch (error) {
        showError('login-error', 'خطأ في الاتصال: ' + error.message);
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// معالجة تنفيذ الصفقة
async function handleTrade(e) {
    e.preventDefault();
    
    const asset = document.getElementById('asset').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const direction = document.getElementById('direction').value;
    const duration = parseInt(document.getElementById('duration').value);
    
    if (!amount || amount <= 0) {
        showError('trade-error', 'المبلغ يجب أن يكون أكبر من صفر');
        return;
    }
    
    showToast('جاري تنفيذ الصفقة...', 'info');
    
    try {
        const response = await fetch('/api/trade', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ asset, amount, direction, duration })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('trade-success', '✅ تم تنفيذ الصفقة بنجاح!');
            showToast('✅ تم تنفيذ الصفقة!', 'success');
            
            // إعادة تعيين النموذج
            document.getElementById('trade-form').reset();
            
            // تحديث السجل
            updateTradesHistory();
            
            // تحديث الرصيد
            updateBalance();
            
            // إخفاء رسالة النجاح بعد 3 ثواني
            setTimeout(() => {
                document.getElementById('trade-success').style.display = 'none';
            }, 3000);
        } else {
            showError('trade-error', data.message || 'فشلت الصفقة');
            showToast('❌ ' + (data.message || 'فشلت الصفقة'), 'error');
        }
    } catch (error) {
        showError('trade-error', 'خطأ: ' + error.message);
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// معالجة تسجيل الخروج
async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        stopAutoUpdate();
        showLoginPage();
        document.getElementById('login-form').reset();
        showToast('✅ تم تسجيل الخروج', 'success');
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// تحديث لوحة التحكم
function updateDashboard(data) {
    if (data.balance !== undefined) {
        document.getElementById('balance-display').textContent = '$' + data.balance.toFixed(2);
    }
    if (data.mode) {
        document.getElementById('mode-display').textContent = data.mode === 'demo' ? '📊 تجريبي' : '💵 حقيقي';
    }
    if (data.trades_count !== undefined) {
        document.getElementById('trades-count').textContent = data.trades_count;
    }
}

// تحديث الرصيد
async function updateBalance() {
    try {
        const response = await fetch('/api/status');
        if (response.ok) {
            const data = await response.json();
            updateDashboard(data);
        }
    } catch (error) {
        console.error('خطأ في تحديث الرصيد:', error);
    }
}

// تحديث سجل الصفقات
async function updateTradesHistory() {
    try {
        const response = await fetch('/api/trades');
        if (response.ok) {
            const data = await response.json();
            const historyDiv = document.getElementById('trades-history');
            
            if (data.trades.length === 0) {
                historyDiv.innerHTML = '<p class="empty-message">لا توجد صفقات حتى الآن</p>';
                return;
            }
            
            historyDiv.innerHTML = data.trades.map(trade => `
                <div class="trade-item">
                    <div class="trade-info">
                        <span class="trade-asset">🎯 ${trade.asset}</span>
                        <span class="trade-time">${new Date(trade.timestamp).toLocaleString('ar-SA')}</span>
                    </div>
                    <span class="trade-direction ${trade.direction}">
                        ${trade.direction === 'call' ? '📈 شراء' : '📉 بيع'}
                    </span>
                    <span>💵 $${trade.amount.toFixed(2)}</span>
                    <span>⏱️ ${trade.duration}d</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('خطأ في جلب السجل:', error);
    }
}

// بدء التحديث التلقائي
function startAutoUpdate() {
    updateTradesHistory();
    updateInterval = setInterval(() => {
        updateBalance();
        updateTradesHistory();
    }, 5000); // تحديث كل 5 ثواني
}

// إيقاف التحديث التلقائي
function stopAutoUpdate() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}

// إظهار صفحة تسجيل الدخول
function showLoginPage() {
    document.getElementById('login-container').classList.add('active');
    document.getElementById('dashboard-container').classList.remove('active');
    isLoggedIn = false;
}

// إظهار لوحة التحكم
function showDashboard() {
    document.getElementById('login-container').classList.remove('active');
    document.getElementById('dashboard-container').classList.add('active');
    isLoggedIn = true;
}

// عرض رسالة خطأ
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// عرض رسالة نجاح
function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// عرض Toast إشعار
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
