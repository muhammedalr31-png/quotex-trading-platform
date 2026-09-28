# ⚡ البدء السريع - 5 دقائق فقط!

## خطوة 1️⃣: تحضير البيئة
```bash
# ادخل المجلد
cd quotex-trading-platform

# أنشئ ملف .env
cp .env.example .env
```

## خطوة 2️⃣: عدّل `.env`
```
QUOTEX_EMAIL=your_email@quotex.com
QUOTEX_PASSWORD=your_password
MODE=demo
```

## خطوة 3️⃣: تثبيت الحزم
```bash
pip install -r requirements.txt
```

## خطوة 4️⃣: اختر الطريقة

### الطريقة A: سطر الأوامر (الأسرع)
```bash
python main.py
```
✅ يظهر الرصيد والمعلومات مباشرة

### الطريقة B: الويب (الأجمل)
```bash
python app.py
```
ثم افتح: http://localhost:5000

---

## ✅ هذا كل شيء!

الآن التطبيق يعمل فوراً:
- ✨ متصل بـ Quotex
- 💰 يعرض الرصيد
- 📊 جاهز للتداول
- 🎯 بدون تعقيد

---

## الأوامر الأساسية:

```python
# الاتصال
bot.connect()

# الرصيد
balance = bot.get_balance()

# تنفيذ صفقة
bot.buy(1, "EURUSD", "call", 1)

# قطع الاتصال
bot.close()
```

---

**بدّون الآن! 🚀**
