const Agenda = require('agenda');

module.exports = {
  agenda: new Agenda(),
  connect: async (agenda) => {
    const url = process.env.MONGODB_URL;
    agenda.database(url, 'tasks', {
      useNewUrlParser: true,
    });
    agenda.on('ready', () => {
      // eslint-disable-next-line global-require
      require('.')(agenda);
      agenda.start();

    });
  },
  disconnect: async (agenda) => (agenda.stop()),
};
