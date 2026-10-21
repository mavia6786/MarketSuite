// Same staff endpoints for both verticals: mounted under /api/shoes/salesmen and /api/clothes/salesmen
const express = require('express');
const { requirePermission: can, requireAnyPermission: canAny } = require('../../middleware/auth');
const audit = require('../../middleware/audit');

module.exports = (ctrl) => {
  const r = express.Router();
  r.get('/', can('staff.view'), ctrl.getAll);
  // The POS needs the list of active salespeople to attribute a sale, so cashiers may read this one.
  r.get('/active', canAny('staff.view', 'sales.create'), ctrl.getActive);
  r.get('/salary-reports', can('payroll.view'), ctrl.getAllSalaryReports);
  r.post('/', can('staff.manage'), audit('staff.create', { entity: 'Staff' }), ctrl.create);
  r.get('/:id', can('staff.view'), ctrl.getById);
  r.put('/:id', can('staff.manage'), audit('staff.update', { entity: 'Staff' }), ctrl.update);
  r.delete('/:id', can('staff.manage'), audit('staff.delete', { entity: 'Staff' }), ctrl.remove);

  r.get('/:id/attendance', can('staff.view'), ctrl.getAttendance);
  r.get('/:id/attendance/present-days', can('staff.view'), ctrl.getPresentDays);
  r.post('/:id/attendance', can('attendance.mark'), ctrl.markAttendance);

  r.get('/:id/salary-report', can('payroll.view'), ctrl.getSalaryReport);
  r.post('/:id/salary/pay', can('payroll.manage'), audit('payroll.pay', { entity: 'Staff', pick: ['month', 'year', 'amountPaid'] }), ctrl.markSalaryPaid);
  r.post('/:id/salary/undo', can('payroll.manage'), audit('payroll.undo', { entity: 'Staff', pick: ['month', 'year'] }), ctrl.undoSalaryPaid);
  r.post('/:id/salary/bonus', can('payroll.manage'), audit('payroll.bonus', { entity: 'Staff', pick: ['month', 'year', 'bonus'] }), ctrl.addBonus);

  r.get('/:id/advances', can('payroll.view'), ctrl.getAdvances);
  r.post('/:id/advances', can('payroll.manage'), audit('payroll.advance_add', { entity: 'Staff', pick: ['amount'] }), ctrl.addAdvance);
  r.delete('/:id/advances/:advanceId', can('payroll.manage'), audit('payroll.advance_delete', { entity: 'Staff' }), ctrl.deleteAdvance);
  return r;
};
