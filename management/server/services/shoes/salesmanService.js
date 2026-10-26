const createStaffService = require('../common/staffServiceFactory');

module.exports = createStaffService({
  Salesman: require('../../models/shoes/Salesman'),
  Attendance: require('../../models/shoes/SalesmanAttendance'),
  SalaryRecord: require('../../models/shoes/ShoeSalaryRecord'),
  Advance: require('../../models/shoes/ShoeAdvance'),
  fk: 'salesmanId',
  idPrefix: 'EMP',
});
