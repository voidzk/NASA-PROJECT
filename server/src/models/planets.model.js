'use strict';

const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse');
const planets = require('./planets.mongo');

// const habitablePlanets = [];

function isHabitablePlanet(planet) {
    return (
        planet['koi_disposition'] === 'CONFIRMED' &&
        planet['koi_insol'] > 0.36 &&
        planet['koi_insol'] < 1.11 &&
        planet['koi_prad'] < 1.6
    );
}
function loadPlanetData() {
    return new Promise((resolve, reject) => {
        fs.createReadStream(
            path.join(
                __dirname,
                '..',
                '..',
                'data',
                'kepler_data.csv'
            )
        )
            .pipe(
                parse({
                    comment: '#',
                    columns: true,
                })
            )
            .on('data', async (data) => {
                if (isHabitablePlanet(data)) {
                    // habitablePlanets.push(data);
                    await savePlanet(data);
                }
            })
            .on('error', (err) => {
                console.log(err);
                reject(err);
            })
            .on('end', async () => {
                const countPlanetsFound = (await getAllPlanets())
                    .length;
                console.log(
                    `${countPlanetsFound} habitable planets found!`
                );
            });
        resolve();
    });
}
//
async function savePlanet(planet) {
    try {
        await planets.updateOne(
            {
                kepler_name: planet.kepler_name,
            },
            {
                kepler_name: planet.kepler_name,
            },
            {
                upsert: true,
            }
        );
    } catch (err) {
        console.error(`Could not save planet${err}`);
    }
}
//
async function getAllPlanets() {
    // return habitablePlanets;
    return await planets.find(
        {},
        {
            __v: 0,
            _id: 0,
        }
    );
}

module.exports = {
    loadPlanetData,
    getAllPlanets,
};
