// Thin HTTP layer shared by shoes + clothes staff routes.
const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Request failed' });
  }
};
const num = (v) => Number(v);

module.exports = (svc) => ({
  getAll: wrap(async (req, res) => res.json(await svc.getAll(req.shop._id))),
  getActive: wrap(async (req, res) => res.json(await svc.getActive(req.shop._id))),
  getById: wrap(async (req, res) => {
    const s = await svc.getById(req.params.id, req.shop._id);
    if (!s) return res.status(404).json({ message: 'Staff not found' });
    res.json(s);
  }),
  create: wrap(async (req, res) => {
    if (!req.body.name || !String(req.body.name).trim()) throw new Error('Name is required');
    res.status(201).json(await svc.create(req.body, req.shop._id));
  }),
  update: wrap(async (req, res) => res.json(await svc.update(req.params.id, req.body, req.shop._id))),
  remove: wrap(async (req, res) => {
    await svc.remove(req.params.id, req.shop._id);
    res.json({ success: true });
  }),

  getAttendance: wrap(async (req, res) => {
    if (!(await svc.getById(req.params.id, req.shop._id))) return res.status(404).json({ message: 'Staff not found' });
    res.json(await svc.getAttendance(req.params.id, num(req.query.month), num(req.query.year)));
  }),
  getPresentDays: wrap(async (req, res) => {
    res.json({ presentDays: await svc.getPresentDays(req.params.id, num(req.query.month), num(req.query.year)) });
  }),
  markAttendance: wrap(async (req, res) => {
    if (!(await svc.getById(req.params.id, req.shop._id))) return res.status(404).json({ message: 'Staff not found' });
    const { date, isPresent, checkIn, checkOut, notes } = req.body;
    res.json(await svc.markAttendance(req.params.id, date, isPresent, checkIn, checkOut, notes));
  }),

  getSalaryReport: wrap(async (req, res) => {
    res.json(await svc.getSalaryReport(req.params.id, num(req.query.month), num(req.query.year), req.shop._id));
  }),
  getAllSalaryReports: wrap(async (req, res) => {
    res.json(await svc.getAllSalaryReports(req.shop._id, num(req.query.month), num(req.query.year)));
  }),
  markSalaryPaid: wrap(async (req, res) => {
    const { month, year, amountPaid, note } = req.body;
    if (!(await svc.getById(req.params.id, req.shop._id))) return res.status(404).json({ message: 'Staff not found' });
    res.json(await svc.markSalaryPaid(req.params.id, num(month), num(year), num(amountPaid), note));
  }),
  undoSalaryPaid: wrap(async (req, res) => {
    if (!(await svc.getById(req.params.id, req.shop._id))) return res.status(404).json({ message: 'Staff not found' });
    await svc.undoSalaryPaid(req.params.id, num(req.body.month), num(req.body.year));
    res.json({ success: true });
  }),
  addBonus: wrap(async (req, res) => {
    const { month, year, bonus, note } = req.body;
    if (!(await svc.getById(req.params.id, req.shop._id))) return res.status(404).json({ message: 'Staff not found' });
    res.json(await svc.addBonus(req.params.id, num(month), num(year), num(bonus), note));
  }),

  getAdvances: wrap(async (req, res) => {
    res.json(await svc.getAdvances(req.params.id, num(req.query.month), num(req.query.year)));
  }),
  addAdvance: wrap(async (req, res) => {
    res.status(201).json(await svc.addAdvance(req.params.id, req.shop._id, req.body));
  }),
  deleteAdvance: wrap(async (req, res) => {
    await svc.deleteAdvance(req.params.advanceId, req.shop._id);
    res.json({ success: true });
  }),
});
