import { v4 as uuidv4 } from 'uuid';

// 환자 데이터 생성 및 시뮬레이션 클래스
export class PatientSimulator {
  constructor() {
    this.data = this.initializeData();
    this.changeHistory = [];
  }

  initializeData() {
    const patients = {};
    const equipment = {};
    
    // 30명의 환자 생성 (데이터 크기 대폭 확장)
    for (let i = 1; i <= 30; i++) {
      const patientId = `P${i.toString().padStart(3, '0')}`;
      patients[patientId] = {
        name: `환자${i}`,
        age: Math.floor(Math.random() * 60) + 20,
        gender: Math.random() > 0.5 ? 'M' : 'F',
        height: this.randomInRange(150, 190),
        weight: this.randomInRange(45, 120),
        bmi: null, // 계산됨
        bloodType: this.getRandomBloodType(),
        
        // 확장된 생체신호
        vitals: {
          heartRate: this.randomInRange(60, 100),
          bloodPressure: {
            systolic: this.randomInRange(90, 140),
            diastolic: this.randomInRange(60, 90),
            meanArterialPressure: null // 계산됨
          },
          spo2: this.randomInRange(95, 100),
          temperature: this.randomInRange(36.0, 37.5),
          respiratoryRate: this.randomInRange(12, 20),
          // 추가 생체신호
          centralVenousPressure: this.randomInRange(2, 8),
          pulmonaryArterialPressure: {
            systolic: this.randomInRange(15, 30),
            diastolic: this.randomInRange(5, 15)
          },
          cardiacOutput: this.randomInRange(4.0, 8.0),
          intracranialPressure: this.randomInRange(5, 15),
          bloodGlucose: this.randomInRange(70, 200),
          urinOutput: this.randomInRange(0.5, 3.0), // ml/kg/hr
          painScore: Math.floor(Math.random() * 11), // 0-10
          glasgowComaScale: {
            eye: Math.floor(Math.random() * 4) + 1,
            verbal: Math.floor(Math.random() * 5) + 1,
            motor: Math.floor(Math.random() * 6) + 1,
            total: null // 계산됨
          }
        },
        
        // 대폭 확장된 약물 정보 (3-8개)
        medications: this.generateMedications(3, 8),
        
        // 검사 결과
        labResults: {
          bloodWork: {
            hemoglobin: this.randomInRange(12.0, 17.0),
            hematocrit: this.randomInRange(36, 52),
            whiteBloodCells: this.randomInRange(4.0, 11.0),
            platelets: this.randomInRange(150, 450),
            sodium: this.randomInRange(135, 145),
            potassium: this.randomInRange(3.5, 5.0),
            chloride: this.randomInRange(98, 107),
            co2: this.randomInRange(22, 29),
            bun: this.randomInRange(7, 20),
            creatinine: this.randomInRange(0.6, 1.3),
            glucose: this.randomInRange(70, 100),
            totalProtein: this.randomInRange(6.0, 8.3),
            albumin: this.randomInRange(3.4, 5.4),
            totalBilirubin: this.randomInRange(0.2, 1.2),
            alt: this.randomInRange(7, 56),
            ast: this.randomInRange(10, 40),
            alkalinePhosphatase: this.randomInRange(44, 147)
          },
          arterialBloodGas: {
            ph: this.randomInRange(7.35, 7.45),
            pco2: this.randomInRange(35, 45),
            po2: this.randomInRange(80, 100),
            hco3: this.randomInRange(22, 26),
            baseExcess: this.randomInRange(-2, 2),
            lactate: this.randomInRange(0.5, 2.2)
          },
          lastUpdated: new Date(Date.now() - Math.random() * 21600000).toISOString()
        },
        
        // 알레르기 정보
        allergies: this.generateAllergies(),
        
        // 진단 정보
        diagnoses: this.generateDiagnoses(),
        
        // 간병 기록 (최근 10개)
        nursingNotes: this.generateNursingNotes(10),
        
        // 의사 오더
        orders: this.generateOrders(),
        
        status: this.getRandomStatus(),
        room: `${Math.floor(Math.random() * 10) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`,
        admissionDate: new Date(Date.now() - Math.random() * 30 * 24 * 3600000).toISOString(),
        emergencyContact: {
          name: `보호자${i}`,
          relationship: this.getRandomRelationship(),
          phone: this.generatePhoneNumber()
        },
        insurance: {
          type: this.getRandomInsuranceType(),
          policyNumber: `INS${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          copay: Math.floor(Math.random() * 50) * 100
        }
      };
      
      // BMI 계산
      const heightM = patients[patientId].height / 100;
      patients[patientId].bmi = Math.round((patients[patientId].weight / (heightM * heightM)) * 10) / 10;
      
      // MAP 계산
      const systolic = patients[patientId].vitals.bloodPressure.systolic;
      const diastolic = patients[patientId].vitals.bloodPressure.diastolic;
      patients[patientId].vitals.bloodPressure.meanArterialPressure = Math.round((systolic + 2 * diastolic) / 3);
      
      // GCS 총점 계산
      const gcs = patients[patientId].vitals.glasgowComaScale;
      gcs.total = gcs.eye + gcs.verbal + gcs.motor;

      // 각 환자마다 장비 할당
      const equipmentId = `EQ${i.toString().padStart(3, '0')}`;
      equipment[equipmentId] = {
        type: this.getRandomEquipmentType(),
        status: Math.random() > 0.1 ? 'active' : 'maintenance',
        patient: patientId,
        lastMaintenance: new Date(Date.now() - Math.random() * 7 * 24 * 3600000).toISOString(),
        batteryLevel: Math.floor(Math.random() * 100)
      };
    }

    return {
      ward: "ICU-A",
      patients,
      equipment,
      timestamp: new Date().toISOString(),
      metrics: {
        totalPatients: Object.keys(patients).length,
        criticalPatients: Object.values(patients).filter(p => p.status === 'critical').length,
        activeEquipment: Object.values(equipment).filter(e => e.status === 'active').length
      }
    };
  }

  randomInRange(min, max) {
    return Math.round((Math.random() * (max - min) + min) * 10) / 10;
  }

  getRandomStatus() {
    const statuses = ['stable', 'critical', 'recovering', 'observation'];
    const weights = [0.6, 0.1, 0.2, 0.1]; // stable이 가장 높은 확률
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < statuses.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return statuses[i];
      }
    }
    return 'stable';
  }

  getRandomEquipmentType() {
    const types = ['ventilator', 'monitor', 'pump', 'dialysis', 'defibrillator'];
    return types[Math.floor(Math.random() * types.length)];
  }

  // 혈액형 생성
  getRandomBloodType() {
    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const weights = [0.28, 0.06, 0.20, 0.05, 0.05, 0.01, 0.32, 0.03]; // 한국인 분포
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < bloodTypes.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return bloodTypes[i];
      }
    }
    return 'O+';
  }

  // 약물 정보 생성
  generateMedications(min, max) {
    const drugNames = [
      'Morphine', 'Midazolam', 'Propofol', 'Fentanyl', 'Norepinephrine', 'Dopamine',
      'Furosemide', 'Heparin', 'Insulin', 'Vancomycin', 'Piperacillin', 'Metoprolol',
      'Lisinopril', 'Simvastatin', 'Omeprazole', 'Acetaminophen', 'Ibuprofen', 'Aspirin',
      'Warfarin', 'Clopidogrel', 'Atorvastatin', 'Amlodipine', 'Losartan', 'Hydrochlorothiazide'
    ];
    
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const medications = [];
    
    for (let i = 0; i < count; i++) {
      medications.push({
        id: uuidv4(),
        name: drugNames[Math.floor(Math.random() * drugNames.length)],
        dosage: `${Math.floor(Math.random() * 200) + 5}${Math.random() > 0.5 ? 'mg' : 'mcg'}`,
        route: Math.random() > 0.5 ? 'IV' : Math.random() > 0.5 ? 'PO' : 'SQ',
        frequency: `${Math.floor(Math.random() * 4) + 1}회/일`,
        lastGiven: new Date(Date.now() - Math.random() * 7200000).toISOString(),
        nextDue: new Date(Date.now() + Math.random() * 7200000).toISOString(),
        prescribedBy: `Dr. ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        indication: this.getRandomIndication(),
        sideEffects: this.getRandomSideEffects(),
        contraindications: this.getRandomContraindications()
      });
    }
    
    return medications;
  }

  // 알레르기 정보 생성
  generateAllergies() {
    const allergens = ['Penicillin', 'Sulfa', 'Latex', 'Shellfish', 'Peanuts', 'Contrast dye', 'Morphine', 'Codeine'];
    const severities = ['mild', 'moderate', 'severe', 'life-threatening'];
    const reactions = ['rash', 'hives', 'swelling', 'difficulty breathing', 'anaphylaxis', 'nausea', 'vomiting'];
    
    const allergies = [];
    const allergyCount = Math.floor(Math.random() * 4); // 0-3개
    
    for (let i = 0; i < allergyCount; i++) {
      allergies.push({
        id: uuidv4(),
        allergen: allergens[Math.floor(Math.random() * allergens.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        reaction: reactions[Math.floor(Math.random() * reactions.length)],
        dateIdentified: new Date(Date.now() - Math.random() * 365 * 24 * 3600000).toISOString()
      });
    }
    
    return allergies;
  }

  // 진단 정보 생성
  generateDiagnoses() {
    const diagnoses = [
      'Acute myocardial infarction', 'Sepsis', 'Pneumonia', 'Heart failure', 'COPD exacerbation',
      'Acute kidney injury', 'Stroke', 'Respiratory failure', 'Shock', 'Multi-organ failure',
      'Post-operative complications', 'Trauma', 'Burns', 'Drug overdose', 'Diabetic ketoacidosis'
    ];
    
    const diagnosisCount = Math.floor(Math.random() * 3) + 1; // 1-3개
    const patientDiagnoses = [];
    
    for (let i = 0; i < diagnosisCount; i++) {
      patientDiagnoses.push({
        id: uuidv4(),
        code: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 99).toString().padStart(2, '0')}.${Math.floor(Math.random() * 9)}`,
        description: diagnoses[Math.floor(Math.random() * diagnoses.length)],
        type: i === 0 ? 'primary' : 'secondary',
        dateOfOnset: new Date(Date.now() - Math.random() * 14 * 24 * 3600000).toISOString(),
        status: Math.random() > 0.8 ? 'resolved' : 'active'
      });
    }
    
    return patientDiagnoses;
  }

  // 간병 기록 생성
  generateNursingNotes(count) {
    const notes = [
      'Patient stable, vitals within normal limits',
      'Administered medications as ordered',
      'Patient complained of pain, given analgesic',
      'Repositioned patient to prevent pressure sores',
      'Encouraged deep breathing and coughing',
      'Patient ambulated in hallway with assistance',
      'Diet advanced as tolerated',
      'Wound dressing changed, no signs of infection',
      'Patient education provided on discharge planning',
      'Family conference held to discuss treatment plan'
    ];
    
    const nursingNotes = [];
    
    for (let i = 0; i < count; i++) {
      nursingNotes.push({
        id: uuidv4(),
        timestamp: new Date(Date.now() - i * 3600000 - Math.random() * 3600000).toISOString(),
        note: notes[Math.floor(Math.random() * notes.length)],
        nurse: `Nurse ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        type: Math.random() > 0.7 ? 'assessment' : Math.random() > 0.5 ? 'intervention' : 'observation'
      });
    }
    
    return nursingNotes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // 의사 오더 생성
  generateOrders() {
    const orderTypes = [
      'Medication order', 'Lab order', 'Imaging order', 'Diet order', 'Activity order',
      'Monitoring order', 'Consultation order', 'Procedure order', 'Discharge order'
    ];
    
    const orders = [];
    const orderCount = Math.floor(Math.random() * 8) + 2; // 2-9개
    
    for (let i = 0; i < orderCount; i++) {
      orders.push({
        id: uuidv4(),
        type: orderTypes[Math.floor(Math.random() * orderTypes.length)],
        description: `Order ${i + 1} - ${orderTypes[Math.floor(Math.random() * orderTypes.length)]}`,
        orderedBy: `Dr. ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        orderTime: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        status: Math.random() > 0.3 ? 'completed' : Math.random() > 0.5 ? 'pending' : 'in-progress',
        priority: Math.random() > 0.8 ? 'STAT' : Math.random() > 0.6 ? 'urgent' : 'routine'
      });
    }
    
    return orders.sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));
  }

  // 보호자 관계 생성
  getRandomRelationship() {
    const relationships = ['spouse', 'parent', 'child', 'sibling', 'friend', 'guardian'];
    return relationships[Math.floor(Math.random() * relationships.length)];
  }

  // 전화번호 생성
  generatePhoneNumber() {
    return `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`;
  }

  // 보험 타입 생성
  getRandomInsuranceType() {
    const insuranceTypes = ['National Health Insurance', 'Medical Aid', 'Private Insurance', 'Workers Compensation'];
    return insuranceTypes[Math.floor(Math.random() * insuranceTypes.length)];
  }

  // 약물 적응증 생성
  getRandomIndication() {
    const indications = ['Pain management', 'Infection control', 'Blood pressure control', 'Cardiac support', 'Sedation', 'Fluid management'];
    return indications[Math.floor(Math.random() * indications.length)];
  }

  // 부작용 생성
  getRandomSideEffects() {
    const sideEffects = ['Drowsiness', 'Nausea', 'Dizziness', 'Hypotension', 'Respiratory depression', 'Allergic reaction'];
    return sideEffects[Math.floor(Math.random() * sideEffects.length)];
  }

  // 금기사항 생성
  getRandomContraindications() {
    const contraindications = ['Allergy to drug', 'Renal impairment', 'Hepatic impairment', 'Pregnancy', 'Elderly patients', 'Children under 18'];
    return contraindications[Math.floor(Math.random() * contraindications.length)];
  }

  // 전체 데이터 반환 (초기 데이터용 - 모든 정보 포함)
  getFullData() {
    return {
      ...this.data,
      timestamp: new Date().toISOString()
    };
  }

  // 실시간 데이터만 반환 (정적 데이터 제외)
  getRealTimeData() {
    const realTimeData = {
      ward: this.data.ward,
      patients: {},
      equipment: {},
      timestamp: new Date().toISOString(),
      metrics: this.data.metrics
    };

    // 환자 실시간 데이터만 추출
    Object.keys(this.data.patients).forEach(patientId => {
      const patient = this.data.patients[patientId];
      realTimeData.patients[patientId] = {
        // 기본 정보 (변경 가능성 있음)
        status: patient.status,
        
        // 생체신호 (실시간)
        vitals: patient.vitals,
        
        // 약물 투여 상태 (실시간 - lastGiven, nextDue만)
        medications: patient.medications.map(med => ({
          id: med.id,
          name: med.name,
          dosage: med.dosage,
          lastGiven: med.lastGiven,
          nextDue: med.nextDue
        }))
      };
    });

    // 장비 실시간 데이터만 추출
    Object.keys(this.data.equipment).forEach(equipmentId => {
      const equipment = this.data.equipment[equipmentId];
      realTimeData.equipment[equipmentId] = {
        type: equipment.type,
        status: equipment.status,
        patient: equipment.patient,
        batteryLevel: equipment.batteryLevel
        // lastMaintenance는 정적 데이터이므로 제외
      };
    });

    return realTimeData;
  }

  // 생체신호 업데이트 (높은 빈도)
  updateVitals() {
    const changes = [];
    const patientIds = Object.keys(this.data.patients);
    
    // 30-50% 환자의 생체신호 변경
    const changeCount = Math.floor(patientIds.length * (0.3 + Math.random() * 0.2));
    const patientsToUpdate = this.shuffleArray(patientIds).slice(0, changeCount);

    patientsToUpdate.forEach(patientId => {
      const patient = this.data.patients[patientId];
      const oldVitals = { ...patient.vitals };
      
      // 생체신호 변경 (현실적인 범위 내에서)
      if (Math.random() > 0.3) {
        patient.vitals.heartRate = this.adjustValue(patient.vitals.heartRate, 60, 100, 5);
      }
      if (Math.random() > 0.5) {
        patient.vitals.spo2 = this.adjustValue(patient.vitals.spo2, 95, 100, 2);
      }
      if (Math.random() > 0.7) {
        patient.vitals.temperature = this.adjustValue(patient.vitals.temperature, 36.0, 37.5, 0.3);
      }
      if (Math.random() > 0.6) {
        patient.vitals.respiratoryRate = this.adjustValue(patient.vitals.respiratoryRate, 12, 20, 2);
      }
      if (Math.random() > 0.4) {
        patient.vitals.bloodPressure.systolic = this.adjustValue(patient.vitals.bloodPressure.systolic, 90, 140, 5);
        patient.vitals.bloodPressure.diastolic = this.adjustValue(patient.vitals.bloodPressure.diastolic, 60, 90, 3);
      }

      // 생체신호 변경사항 기록
      Object.keys(patient.vitals).forEach(key => {
        if (key === 'bloodPressure') {
          Object.keys(patient.vitals.bloodPressure).forEach(bpKey => {
            if (oldVitals.bloodPressure[bpKey] !== patient.vitals.bloodPressure[bpKey]) {
              changes.push({
                patientId,
                path: `vitals.bloodPressure.${bpKey}`,
                oldValue: oldVitals.bloodPressure[bpKey],
                newValue: patient.vitals.bloodPressure[bpKey]
              });
            }
          });
        } else if (oldVitals[key] !== patient.vitals[key]) {
          changes.push({
            patientId,
            path: `vitals.${key}`,
            oldValue: oldVitals[key],
            newValue: patient.vitals[key]
          });
        }
      });

      // 약물 투여 시간 업데이트 (30% 확률)
      if (Math.random() > 0.7) {
        patient.medications.forEach((medication, index) => {
          const oldLastGiven = medication.lastGiven;
          const oldNextDue = medication.nextDue;
          
          // 새로운 투여 시간으로 업데이트 (일부 약물만)
          if (Math.random() > 0.5) {
            medication.lastGiven = new Date().toISOString();
            medication.nextDue = new Date(Date.now() + (Math.random() * 6 + 4) * 3600000).toISOString(); // 4-10시간 후
            
            changes.push({
              patientId,
              path: `medications.${index}.lastGiven`,
              oldValue: oldLastGiven,
              newValue: medication.lastGiven
            });
            changes.push({
              patientId,
              path: `medications.${index}.nextDue`,
              oldValue: oldNextDue,
              newValue: medication.nextDue
            });
          }
        });
      }
    });

    this.data.timestamp = new Date().toISOString();
    return changes;
  }

  // 장비 및 기타 데이터 업데이트 (낮은 빈도)
  updateNonCriticalData() {
    const changes = [];
    
    // 장비 상태 업데이트 (10% 확률)
    Object.keys(this.data.equipment).forEach(equipmentId => {
      if (Math.random() > 0.9) {
        const equipment = this.data.equipment[equipmentId];
        const oldStatus = equipment.status;
        equipment.status = Math.random() > 0.8 ? 'maintenance' : 'active';
        equipment.batteryLevel = this.adjustValue(equipment.batteryLevel, 0, 100, 10);
        
        if (oldStatus !== equipment.status) {
          changes.push({
            equipmentId,
            path: 'status',
            oldValue: oldStatus,
            newValue: equipment.status
          });
        }
      }
    });

    // 환자 상태 업데이트 (5% 확률)
    Object.keys(this.data.patients).forEach(patientId => {
      if (Math.random() > 0.95) {
        const patient = this.data.patients[patientId];
        const oldStatus = patient.status;
        patient.status = this.getRandomStatus();
        
        if (oldStatus !== patient.status) {
          changes.push({
            patientId,
            path: 'status',
            oldValue: oldStatus,
            newValue: patient.status
          });
        }
      }
    });

    this.data.timestamp = new Date().toISOString();
    return changes;
  }

  adjustValue(current, min, max, maxChange) {
    const change = (Math.random() - 0.5) * 2 * maxChange;
    const newValue = current + change;
    return Math.max(min, Math.min(max, Math.round(newValue * 10) / 10));
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Delta 업데이트를 위한 변경사항을 JSON Patch 형태로 변환
  changesToJsonPatch(changes) {
    return changes.map(change => ({
      op: 'replace',
      path: `/${change.patientId ? 'patients' : 'equipment'}/${change.patientId || change.equipmentId}/${change.path}`,
      value: change.newValue
    }));
  }

  // Key-Value 형태로 변환
  changesToKeyValue(changes) {
    const updates = {};
    changes.forEach(change => {
      const entityType = change.patientId ? 'patients' : 'equipment';
      const entityId = change.patientId || change.equipmentId;
      
      if (!updates[entityType]) {
        updates[entityType] = {};
      }
      if (!updates[entityType][entityId]) {
        updates[entityType][entityId] = {};
      }
      
      updates[entityType][entityId][change.path] = change.newValue;
    });
    return updates;
  }

  // 모든 데이터 재생성 (초기화용)
  regenerateAllData() {
    console.log('🔄 환자 시뮬레이터 데이터 재생성 중...');
    this.data = this.initializeData();
    this.changeHistory = [];
    console.log('✅ 환자 시뮬레이터 데이터 재생성 완료');
  }
} 