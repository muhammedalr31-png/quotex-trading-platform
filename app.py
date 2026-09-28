#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
منصة Quotex التداول - تطبيق Flask
Quotex Trading Platform - Flask App
"""

import os
import json
from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
from datetime import datetime, timedelta

try:
    from quotexapi.stable_api import Quotex
    QUOTEX_AVAILABLE = True
except ImportError:
    QUOTEX_AVAILABLE = False
    print("⚠️ تحذير: مكتبة quotexapi غير مثبتة")

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# متغيرات الجلسة
sessions_store = {}

class QuotexSession:
    def __init__(self, email, password):
        self.email = email
        self.password = password
        self.api = None
        self.connected = False
        self.balance = 0
        self.mode = 'demo'
        self.trades = []
        
    def connect(self, mode='demo'):
        """الاتصال بـ Quotex"""
        if not QUOTEX_AVAILABLE:
            return {'success': False, 'message': 'مكتبة quotexapi غير متاحة'}
        
        try:
            self.api = Quotex(self.email, self.password)
            if self.api.connect():
                self.mode = mode
                self.api.change_balance(mode)
                self.balance = self.api.get_balance()
                self.connected = True
                return {'success': True, 'message': 'تم الاتصال بنجاح', 'balance': self.balance}
            else:
                return {'success': False, 'message': 'فشل الاتصال - تحقق من البيانات'}
        except Exception as e:
            return {'success': False, 'message': f'خطأ: {str(e)}'}
    
    def get_balance(self):
        """جلب الرصيد"""
        if not self.connected or not self.api:
            return 0
        try:
            self.balance = self.api.get_balance()
            return self.balance
        except:
            return self.balance
    
    def execute_trade(self, asset, amount, direction, duration):
        """تنفيذ صفقة"""
        if not self.connected or not self.api:
            return {'success': False, 'message': 'غير متصل'}
        
        try:
            result = self.api.buy(amount, asset, direction, duration)
            trade = {
                'timestamp': datetime.now().isoformat(),
                'asset': asset,
                'amount': amount,
                'direction': direction,
                'duration': duration,
                'result': str(result)
            }
            self.trades.append(trade)
            self.balance = self.get_balance()
            return {'success': True, 'message': 'تم تنفيذ الصفقة', 'trade': trade}
        except Exception as e:
            return {'success': False, 'message': f'خطأ: {str(e)}'}
    
    def close(self):
        """قطع الاتصال"""
        if self.api and self.connected:
            try:
                self.api.close()
            except:
                pass
            self.connected = False

# Routes

@app.route('/')
def index():
    """الصفحة الرئيسية"""
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    """تسجيل الدخول"""
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    mode = data.get('mode', 'demo')
    
    if not email or not password:
        return jsonify({'success': False, 'message': 'البريد والكلمة مطلوبان'}), 400
    
    try:
        # إنشاء جلسة جديدة
        session_id = f"{email}_{datetime.now().timestamp()}"
        qx_session = QuotexSession(email, password)
        result = qx_session.connect(mode)
        
        if result['success']:
            sessions_store[session_id] = qx_session
            session['session_id'] = session_id
            session['email'] = email
            session.permanent = True
            app.permanent_session_lifetime = timedelta(hours=24)
            return jsonify(result)
        else:
            return jsonify(result), 401
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@app.route('/api/status', methods=['GET'])
def status():
    """الحصول على حالة الجلسة"""
    session_id = session.get('session_id')
    if not session_id or session_id not in sessions_store:
        return jsonify({'connected': False, 'message': 'لا توجد جلسة نشطة'}), 401
    
    qx_session = sessions_store[session_id]
    return jsonify({
        'connected': qx_session.connected,
        'email': qx_session.email,
        'balance': qx_session.get_balance(),
        'mode': qx_session.mode,
        'trades_count': len(qx_session.trades)
    })

@app.route('/api/trade', methods=['POST'])
def trade():
    """تنفيذ صفقة"""
    session_id = session.get('session_id')
    if not session_id or session_id not in sessions_store:
        return jsonify({'success': False, 'message': 'لا توجد جلسة نشطة'}), 401
    
    data = request.get_json()
    asset = data.get('asset', 'EURUSD')
    amount = float(data.get('amount', 1))
    direction = data.get('direction', 'call')
    duration = int(data.get('duration', 1))
    
    qx_session = sessions_store[session_id]
    result = qx_session.execute_trade(asset, amount, direction, duration)
    
    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 400

@app.route('/api/trades', methods=['GET'])
def get_trades():
    """جلب السجل التاريخي للصفقات"""
    session_id = session.get('session_id')
    if not session_id or session_id not in sessions_store:
        return jsonify({'trades': []}), 401
    
    qx_session = sessions_store[session_id]
    return jsonify({'trades': qx_session.trades[-20:]})

@app.route('/api/logout', methods=['POST'])
def logout():
    """تسجيل الخروج"""
    session_id = session.get('session_id')
    if session_id and session_id in sessions_store:
        sessions_store[session_id].close()
        del sessions_store[session_id]
    
    session.clear()
    return jsonify({'success': True, 'message': 'تم تسجيل الخروج'})

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'الصفحة غير موجودة'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'خطأ في الخادم'}), 500

if __name__ == '__main__':
    print("🚀 تطبيق Quotex يعمل على http://localhost:5000")
    print(f"📚 حالة quotexapi: {'✅ متاح' if QUOTEX_AVAILABLE else '❌ غير متاح'}")
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
