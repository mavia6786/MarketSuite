const { toDay, dayRange, daysInMonth } = require('../../utils/dates');

const round2 = (n) => Math.round(n * 100) / 100;

// Working days = all days of the month except Sundays.
function workingDaysInMonth(month, year) {
  let count = 0;
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    if (new Date(year, month - 1, d).getDay() !== 0) count++;
  }
  return count;
}

/**
 * One payroll engine for both verticals (shoes / clothes).
 * `fk` is the name of the salesman foreign-key used on attendance / salary-record / advance docs.
 */
module.exports = function createStaffService({ Salesman, Attendance, SalaryRecord, Advance, fk, idPrefix }) {
  const svc = {};

  // ── CRUD ────────────────────────────────────────────────────────────────
  svc.getAll = (shopId) => Salesman.find({ shopId }).sort({ name: 1 });
  svc.getActive = (shopId) => Salesman.find({ shopId, isActive: true }).sort({ name: 1 });
  svc.getById = (id, shopId) => Salesman.findOne({ _id: id, shopId });

  svc.create = async (data, shopId) => {
    let employeeId = (data.employeeId || '').trim();
    if (!employeeId) {
      const count = await Salesman.countDocuments({ shopId });
      employeeId = `${idPrefix}-${String(count + 1).padStart(3, '0')}`;
    }
    return Salesman.create({
      name: data.name, employeeId, phone: data.phone, email: data.email, salary: data.salary,
      joiningDate: data.joiningDate, address: data.address, notes: data.notes,
      isActive: data.isActive !== false, shopId,
    });
  };

  svc.update = async (id, data, shopId) => {
    const e = await Salesman.findOne({ _id: id, shopId });
    if (!e) throw new Error('Staff not found');
    ['name', 'employeeId', 'phone', 'email', 'salary', 'joiningDate', 'address', 'notes', 'isActive'].forEach((k) => {
      if (data[k] !== undefined) e[k] = data[k];
    });
    await e.save();
    return e;
  };

  svc.remove = async (id, shopId) => {
    const removed = await Salesman.findOneAndDelete({ _id: id, shopId });
    if (removed) {
      await Attendance.deleteMany({ [fk]: id });
      await SalaryRecord.deleteMany({ [fk]: id });
      await Advance.deleteMany({ [fk]: id });
    }
  };

  // ── Attendance ──────────────────────────────────────────────────────────
  svc.getAttendance = (salesmanId, month, year) => {
    const { start, end } = dayRange(year, month);
    return Attendance.find({ [fk]: salesmanId, date: { $gte: start, $lt: end } }).sort({ date: 1 });
  };

  svc.getPresentDays = (salesmanId, month, year) => {
    const { start, end } = dayRange(year, month);
    return Attendance.countDocuments({ [fk]: salesmanId, date: { $gte: start, $lt: end }, isPresent: true });
  };

  svc.markAttendance = async (salesmanId, date, isPresent, checkIn = '', checkOut = '', notes = '') => {
    let hours = 0;
    if (checkIn && checkOut) {
      const [inH, inM] = checkIn.split(':').map(Number);
      const [outH, outM] = checkOut.split(':').map(Number);
      if (outH * 60 + outM > inH * 60 + inM) hours = (outH * 60 + outM - (inH * 60 + inM)) / 60;
    }
    const day = toDay(date);
    const set = { isPresent: !!isPresent };
    if (checkIn) set.checkIn = checkIn;
    if (checkOut) set.checkOut = checkOut;
    if (hours > 0) set.workingHours = hours;
    if (notes) set.notes = notes;
    return Attendance.findOneAndUpdate(
      { [fk]: salesmanId, date: day },
      { $set: set, $setOnInsert: { [fk]: salesmanId, date: day } },
      { upsert: true, new: true }
    );
  };

  // ── Advances ────────────────────────────────────────────────────────────
  svc.getAdvances = (salesmanId, month, year) => {
    const { start, end } = dayRange(year, month);
    return Advance.find({ [fk]: salesmanId, date: { $gte: start, $lt: end } }).sort({ date: 1 });
  };

  svc.addAdvance = async (salesmanId, shopId, { amount, date, note = '' }) => {
    const s = await Salesman.findOne({ _id: salesmanId, shopId });
    if (!s) throw new Error('Staff not found');
    if (!(Number(amount) > 0)) throw new Error('Advance amount must be greater than 0');
    return Advance.create({ shopId, [fk]: salesmanId, amount: Number(amount), date: toDay(date || new Date()), note });
  };

  svc.deleteAdvance = async (advanceId, shopId) => {
    await Advance.findOneAndDelete({ _id: advanceId, shopId });
  };

  // ── Salary records (bonus / payment) ────────────────────────────────────
  async function getOrCreateRecord(salesmanId, month, year) {
    let rec = await SalaryRecord.findOne({ [fk]: salesmanId, month, year });
    if (!rec) rec = await SalaryRecord.create({ [fk]: salesmanId, month, year });
    return rec;
  }

  svc.markSalaryPaid = async (salesmanId, month, year, amountPaid, note = '') => {
    const rec = await getOrCreateRecord(salesmanId, month, year);
    rec.isPaid = true;
    rec.amountPaid = amountPaid;
    rec.paymentNote = note;
    rec.paidAt = new Date();
    await rec.save();
    return rec;
  };

  svc.undoSalaryPaid = async (salesmanId, month, year) => {
    const rec = await SalaryRecord.findOne({ [fk]: salesmanId, month, year });
    if (!rec) return;
    rec.isPaid = false;
    rec.amountPaid = 0;
    rec.paidAt = null;
    await rec.save();
  };

  svc.addBonus = async (salesmanId, month, year, bonus, note = '') => {
    const rec = await getOrCreateRecord(salesmanId, month, year);
    rec.bonus = bonus;
    rec.bonusNote = note;
    await rec.save();
    return rec;
  };

  // ── Salary report ───────────────────────────────────────────────────────
  // earned      = perDay × presentDays
  // net payable = earned + bonus − advances taken that month (never below 0; the excess is shown as carry-over)
  svc.getSalaryReport = async (salesmanId, month, year, shopId) => {
    const salesman = shopId ? await Salesman.findOne({ _id: salesmanId, shopId }) : await Salesman.findById(salesmanId);
    if (!salesman) throw new Error('Staff not found');

    const workingDays = workingDaysInMonth(month, year);
    const [attendance, advances, record] = await Promise.all([
      svc.getAttendance(salesmanId, month, year),
      svc.getAdvances(salesmanId, month, year),
      SalaryRecord.findOne({ [fk]: salesmanId, month, year }),
    ]);
    const presentDays = attendance.filter((a) => a.isPresent).length;

    const perDay = workingDays > 0 ? salesman.salary / workingDays : 0;
    const earned = round2(perDay * presentDays);
    const deductions = round2(salesman.salary - earned);
    const bonus = record?.bonus || 0;
    const advanceTotal = advances.reduce((s, a) => s + a.amount, 0);
    const gross = earned + bonus;
    const advanceDeducted = Math.min(advanceTotal, gross);
    const netPayable = round2(gross - advanceDeducted);
    const amountPaid = record?.amountPaid || 0;

    return {
      salesman, month, year, workingDays, presentDays, absentDays: workingDays - presentDays,
      monthlySalary: salesman.salary, perDaySalary: round2(perDay), earnedSalary: earned, deductions,
      bonus, bonusNote: record?.bonusNote || '',
      advanceTotal, advanceDeducted, advanceCarryOver: advanceTotal - advanceDeducted, advances,
      netPayable, isPaid: record?.isPaid || false, amountPaid,
      remaining: round2(netPayable - amountPaid), paymentNote: record?.paymentNote || '',
      totalWorkingHours: attendance.reduce((s, a) => s + (a.workingHours || 0), 0),
      attendance,
    };
  };

  svc.getAllSalaryReports = async (shopId, month, year) => {
    const all = await svc.getActive(shopId);
    return Promise.all(all.map((s) => svc.getSalaryReport(s._id, month, year, shopId)));
  };

  // Salary cost of a month for profit/loss. Accrual based:
  //  • staff with attendance marked this month  → earned salary + bonus
  //  • staff with nothing marked (not tracked)  → full salary assumed (flagged as estimated)
  //  • staff who joined after the month / inactive without attendance → ignored
  svc.payrollCost = async (shopId, month, year) => {
    const { start, end } = dayRange(year, month);
    const staff = await Salesman.find({ shopId });
    if (!staff.length) return { salary: 0, bonus: 0, estimated: false };
    const ids = staff.map((s) => s._id);
    const [att, recs] = await Promise.all([
      Attendance.find({ [fk]: { $in: ids }, date: { $gte: start, $lt: end } }),
      SalaryRecord.find({ [fk]: { $in: ids }, month, year }),
    ]);
    const presentBy = {}; const markedBy = {};
    att.forEach((a) => {
      const k = String(a[fk]);
      markedBy[k] = true;
      if (a.isPresent) presentBy[k] = (presentBy[k] || 0) + 1;
    });
    const bonusBy = {};
    recs.forEach((r) => { bonusBy[String(r[fk])] = r.bonus || 0; });

    const wd = workingDaysInMonth(month, year);
    let salary = 0, bonus = 0, estimated = false;
    for (const s of staff) {
      const k = String(s._id);
      const joined = s.joiningDate && new Date(s.joiningDate) >= end;
      if (joined) continue;
      if (markedBy[k]) {
        salary += wd > 0 ? (s.salary / wd) * (presentBy[k] || 0) : 0;
        bonus += bonusBy[k] || 0;
      } else if (s.isActive) {
        salary += s.salary;
        bonus += bonusBy[k] || 0;
        estimated = true;
      }
    }
    return { salary: round2(salary), bonus: round2(bonus), estimated };
  };

  svc.monthlyFullSalary = async (shopId) => {
    const staff = await Salesman.find({ shopId, isActive: true });
    return staff.reduce((s, x) => s + (x.salary || 0), 0);
  };

  return svc;
};
