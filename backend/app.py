from flask import Flask, request, jsonify
from datetime import datetime, timedelta

app = Flask(_name_)

# Mock Data (In a real app, use a Database like SQLite or PostgreSQL)
appointments = []
doctors = {
    "1": {"name": "Dr. Smith", "specialty": "General", "current_delay_mins": 0}
}

@app.route('/api/book-appointment', methods=['POST'])
def book_appointment():
    data = request.json
    
    # Smart Logic: Estimate duration based on consultation type
    # (In a full version, this would use your Kaggle dataset ML model)
    base_duration = 20 # default 20 mins
    if data.get('type') == 'emergency':
        base_duration = 45
    
    new_appointment = {
        "id": len(appointments) + 1,
        "patient_name": data['name'],
        "doctor_id": data['doctor_id'],
        "scheduled_time": data['time'],
        "estimated_duration": base_duration,
        "status": "scheduled"
    }
    
    appointments.append(new_appointment)
    return jsonify({"message": "Appointment booked!", "estimated_duration": base_duration}), 201

@app.route('/api/get-wait-time/<doctor_id>', methods=['GET'])
def get_wait_time(doctor_id):
    # Logic: Calculate real-time delay
    doctor = doctors.get(doctor_id)
    # Sum of remaining durations in the queue + doctor's current delay
    total_wait = doctor['current_delay_mins'] + 15 # Simple placeholder logic
    
    return jsonify({
        "doctor": doctor['name'],
        "estimated_wait_time_mins": total_wait,
        "status": "Busy" if total_wait > 30 else "On Time"
    })

if _name_ == '_main_':
    app.run(debug=True)