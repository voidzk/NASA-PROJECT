const app = require('./app');
const http = require('http');

const { mongoConnect } = require('./services/mongo');

const { loadPlanetData } = require('./models/planets.model');
const { loadLaunchData } = require('./models/launches.model');

const PORT = process.env.PORT || 8000;

const server = http.createServer(app);

//-----------COMMENT  DB

//-------------------
async function startServer() {
    await mongoConnect();
    await loadPlanetData();
    await loadLaunchData();

    server.listen(PORT, () => {
        console.log(`Listening on PORT ${PORT}`);
    });
}
startServer();
