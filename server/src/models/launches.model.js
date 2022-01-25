'use strict';

const axios = require('axios');

const launchesDB = require('./launches.mongo');
const planets = require('./planets.mongo');

const DEFAULT_FLIGHT_NUMBER = 100;
// const launches = new Map();
// let latestFlightNumber = 100;

// const launch = {
//     flightNumber: 100, //flight_number
//     mission: 'Kepler Exploration X', //name
//     rocket: 'Explorer IS1', //rocket.name
//     launchDate: new Date('December 27, 2030'), //date_local
//     target: 'Kepler-442 b', // not-applicable
//     customers: ['ZTM', 'NASA'], //payload.customers
//     upcoming: true, //upcoming
//     success: true, //success
// };
// saveLaunch(launch);
// launches.set(launch.flightNumber, launch);
const SPACEX_API_URL =
    ' https://api.spacexdata.com/v4/launches/query';

async function populateLaunches() {
    console.log('Downloading launch data....');
    const response = await axios.post(SPACEX_API_URL, {
        query: {},
        options: {
            pagination: false,
            populate: [
                {
                    path: 'rocket',
                    select: {
                        name: 1,
                    },
                },
                {
                    path: 'payloads',
                    select: {
                        customers: 1,
                    },
                },
            ],
        },
    });
    if (response.status !== 200) {
        console.log('Problem fetching data');
        throw new Error('Launch data download failed');
    }
    const launchDocs = response.data.docs;
    for (const launchDoc of launchDocs) {
        const payloads = launchDoc['payloads'];
        const customers = payloads.flatMap((payload) => {
            return payload['customers'];
        });
        const launch = {
            flightNumber: launchDoc['flight_number'],
            mission: launchDoc['name'],
            rocket: launchDoc['rocket']['name'],
            launchDate: launchDoc['date_local'],
            upcoming: launchDoc['upcoming'],
            success: launchDoc['success'],
            customers,
        };
        console.log(`${launch.flightNumber} ${launch.mission}`);
        await saveLaunch(launch);
    }
}

async function loadLaunchData() {
    const firstLaunch = await findLaunch({
        flightNumber: 1,
        rocket: 'Falcon 1',
        mission: 'FalconSat',
    });
    if (firstLaunch) {
        console.log('Launch data already loaded!');
    } else {
        await populateLaunches();
    }
}

async function findLaunch(filter) {
    return await launchesDB.findOne(filter);
}

async function existsLaunchWithId(launchId) {
    return await findLaunch({
        flightNumber: launchId,
    });
}

async function getLatestFlightNumber() {
    const latestLaunch = await launchesDB
        .findOne({})
        .sort('-flightNumber');
    if (!latestLaunch) return DEFAULT_FLIGHT_NUMBER;
    return latestLaunch.flightNumber;
}

async function getAllLaunches(skip, limit) {
    // return Array.from(launches.values());
    return await launchesDB
        .find(
            {},
            {
                _id: 0,
                __v: 0,
            }
        )
        .sort({ flightNumber: 1 })
        .skip(skip)
        .limit(limit);
}

async function scheduleNewLaunch(launch) {
    const planet = await planets.findOne({
        kepler_name: launch.target,
    });
    if (!planet) {
        throw new Error('No matching planets were found');
    }
    const newFlightNumber = (await getLatestFlightNumber()) + 1;
    const newLaunch = Object.assign(launch, {
        upcoming: true,
        success: true,
        customers: ['Zero to Mastery', 'NASA'],
        flightNumber: newFlightNumber,
    });

    await saveLaunch(newLaunch);
}

async function saveLaunch(launch) {
    await launchesDB.findOneAndUpdate(
        {
            flightNumber: launch.flightNumber,
        },
        launch,
        {
            upsert: true,
        }
    );
}
// function addNewLaunch(launch) {
//     latestFlightNumber++;
//     launches.set(
//         latestFlightNumber,
//         Object.assign(launch, {
//             upcoming: true,
//             success: true,
//             customers: ['Zero to Mastery', 'NASA'],
//             flightNumber: latestFlightNumber,
//         })
//     );
// }

async function abortLaunchById(launchId) {
    // const aborted = launches.get(launchId);
    // aborted.upcoming = false;
    // aborted.success = false;

    // return aborted;

    const aborted = await launchesDB.updateOne(
        {
            flightNumber: launchId,
        },
        {
            upcoming: false,
            success: false,
        }
    );
    console.log(aborted);
    return (
        aborted.acknowledged === true && aborted.modifiedCount === 1
    );
}

module.exports = {
    getAllLaunches,
    loadLaunchData,
    // addNewLaunch,
    existsLaunchWithId,
    abortLaunchById,
    scheduleNewLaunch,
};
