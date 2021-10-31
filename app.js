const express = require('express');
const schedule = require('node-schedule');

const fs = require('fs');
const path = require('path');


const app = express();
app.listen(3000);

const p = path.join(path.dirname(require.main.filename), 'config_server.json');


const structureRes = {};
let counter = 0;


const getDataFromFile = (cb) => {
    fs.readFile(p, (err, fileContent) => {
        if (err) {
            return cb([]);
        }
        cb(JSON.parse(fileContent));
    });
}


// create schedule based on configuration
getDataFromFile(data => {
    const scheduleObj = {
        hour: data.definitions.eventConfigurations.safetySummeryReport.schedule.hour,
        minute: data.definitions.eventConfigurations.safetySummeryReport.schedule.minute,
        day: (data.definitions.eventConfigurations.safetySummeryReport.schedule.day) != 0 ? (data.definitions.eventConfigurations.safetySummeryReport.schedule.day) : 7,
        //0:sunday
        //6: saturday
    }
    const j = schedule.scheduleJob(scheduleObj.minute + ' ' + scheduleObj.hour + ' * * ' + scheduleObj.day, function () {
        counter = 0;
        generateAndSendReport();
    });
})


// we don't need this requires handler (only for manually request data.) 
app.get('/', (req, res, next) => {
    getDataFromFile(data => {
        counter = 0;
        // gettting list of objects
        const listOfProjects = Object.keys((data['definitions']['projects']))
        let listOfProjectWithEmail = [];
        // get js object : {obj:string, pdf: string, emails: string[]} 
        listOfProjects.forEach(element => {
            const emails = getDataFromChildNode(data['definitions']['projects'][element], 5).join().split(',');
            emails.forEach(email => {
                structureRes[email] = [];
            })
            listOfProjectWithEmail.push({
                'obj': element,
                'pdf': '',
                'emails': getDataFromChildNode(data['definitions']['projects'][element], 5).join(),
            })
        });

        // send request to get pdf url (once per object)
        listOfProjectWithEmail.forEach(elem => {
            getPDFUrl(elem.obj).then(url => {
                elem.pdf = url;
                mappingUserAndObjects(url, elem.emails.split(',')); // put url to PDF for each email with existing project

            }).then(() => {
                if (counter === listOfProjectWithEmail.length) {
                    mySendEmail(structureRes); // call function to send email based on object {email: string, pdfURL: string[]}
                    res.status(200).send(`<div>Email was sent:</div>
                                         <div><pre>` +
                        JSON.stringify(structureRes, undefined, 2) +
                        `</pre></div>`);
                }
            });
        });
    });
});


function generateAndSendReport() {
    getDataFromFile(data => {
        // gettting list of objects
        const listOfProjects = Object.keys((data['definitions']['projects']))
        let listOfProjectWithEmail = [];
        // get js object : {obj:string, pdf: string, emails: string[]} 
        listOfProjects.forEach(element => {
            const emails = getDataFromChildNode(data['definitions']['projects'][element], 5).join().split(',');
            emails.forEach(email => {
                structureRes[email] = [];
            });
            listOfProjectWithEmail.push({
                'obj': element,
                'pdf': '',
                'emails': getDataFromChildNode(data['definitions']['projects'][element], 5).join(),
            });
        });

        // send request to get pdf url (once per object)
        listOfProjectWithEmail.forEach(elem => {
            getPDFUrl(elem.obj).then(url => {
                elem.pdf = url;
                mappingUserAndObjects(url, elem.emails.split(',')); // put url to PDF for each email with existing project
            }).then(() => {
                if (counter === listOfProjectWithEmail.length) {
                    mySendEmail(structureRes); // call function to send email based on object {email: string, pdfURL: string[]}

                    console.log(`<div>Email was sent with schedule:</div>
                    <div><pre>` +
                        JSON.stringify(structureRes, undefined, 2) +
                        `</pre></div>`);
                }
            });
        });
    });
}


function getDataFromChildNode(obj, n) {
    if (n == 1) {
        return Object.keys(obj).map(function (k) {
            return obj[k];
        });
    } else return Object.keys(obj).map(function (k) {
        return getDataFromChildNode(obj[k], n - 1);
    });
}


function loadPDFUrl(x) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(x);
        }, Math.floor(Math.random() * 10000) + 1);
    });
};


const getPDFUrl = async function (objectName) {
    // mock function of getting PDF
    let a = await loadPDFUrl('_url_to_pdf_'); // async method to get some responce with random delay (0 - 10 sec)
    return objectName + a + '.pdf';
};


function mappingUserAndObjects(url, emails) {
    counter++;
    emails.forEach(email => {
        structureRes[email].push(url);
    });
}


function mySendEmail(structureResForEmail) {
    Object.keys(structureResForEmail).forEach((key) => {
        console.log(`Sent Email to: ` + key + ` with urls: ` + structureResForEmail[key]);
    });
}
