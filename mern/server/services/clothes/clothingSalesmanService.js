const createStaffService = require('../common/staffServiceFactory');

module.exports = createStaffService({
  Salesman: require('../../models/clothes/ClothingSalesman'),
  Attendance: require('../../models/clothes/ClothingSalesmanAttendance'),
  SalaryRecord: require('../../models/clothes/ClothingSalaryRecord'),
  Advance: require('../../models/clothes/ClothingAdvance'),
  fk: 'clothingSalesmanId',
  idPrefix: 'CLT',
});
