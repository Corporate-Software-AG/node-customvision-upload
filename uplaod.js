const fs = require('fs');
const TrainingApi = require("@azure/cognitiveservices-customvision-training");
const msRest = require("@azure/ms-rest-js");

const trainingKey = process.env.TRAINING_KEY;
const trainingEndpoint = process.env.TRAINING_ENDPOINT;
const projectId = process.env.PROJECT_ID;

const credentials = new msRest.ApiKeyCredentials({ inHeader: { "Training-key": trainingKey } });
const trainer = new TrainingApi.TrainingAPIClient(credentials, trainingEndpoint);

const sampleDataRoot = "Images";
const maxPerTag = 50;

async function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function upload(projectId, path, tagId) {
    console.log("upload " + path)
    try {
        let response = await trainer.createImagesFromData(projectId, fs.readFileSync(path), { tagIds: [tagId] })
        console.log("Successful: " + response.isBatchSuccessful, "Reason: " + response.images[0].status);
    } catch (e) {
        if (e.statusCode === 429) {
            console.log("RETRY")
            await sleep(1000);
            upload(projectId, path, tagId);
        }
    }
}

async function upload() {
    console.log("Start Upload...");
    let tags = await trainer.getTags(projectId);
    const dirs = fs.readdirSync(sampleDataRoot)
    for (const d of dirs) {
        let tagName = d.substring(d.indexOf('-') + 1)
        console.log("Start at: " + d + " with tag: " + tagName)
        let tag = tags.filter(t => t.name === tagName)[0]
        if (!tag) {
            console.log("Creating tag " + tagName);
            tag = await trainer.createTag(projectId, tagName)
            console.log(tag);
            tags.push(tag);
            await sleep(250);
        }
        let imageDir = fs.readdirSync(`${sampleDataRoot}/${d}`)
        let i = 0;
        for (const f of imageDir) {
            console.log(tag)
            if (i < maxPerTag) {
                let path = `${sampleDataRoot}/${d}/${f}`;
                upload(projectId, path, tag.id)
                await sleep(250);
            }
            i++;
        };
    };
    console.log("Finish Upload...");
}

(async () => {
    console.log("Start Script...");
    await upload();
    console.log("Finish Script...");
})()
