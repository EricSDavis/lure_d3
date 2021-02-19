const express = require('express');
const path = require('path');
const fs = require('fs');
const child = require('child_process');
const tsv = require('node-tsv-json');

// Init express
const app = express();

// Init middleware
app.use(express.urlencoded({ extended: false }));

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Return index
// app.get('/*', function (req, res) {
//     res.sendFile('index.html', {root: path.join(__dirname, 'public')});
// });

// Run lure
app.post('/design', (req, res) => {
    console.log('designing...');
    console.log(req.body);

    // Parse/Reformat Inputs
    var targetRegion = req.body.targetRegion;
    var chr = targetRegion.split(':')[0];
    var start = targetRegion.split(':')[1].split('-')[0];
    var end = targetRegion.split(':')[1].split('-')[1];
    var resEnz = req.body.restrictionEnzyme.split(', ')[0];

    // Define lure paths
    var lurePath = '/Users/eric/Phanstiel\\ Lab\\ Dropbox/Eric\\ Davis/projects/LURE/apps/lure/shell/lure.sh';
    var genomePath = '/Users/eric/Phanstiel\\ Lab\\ Dropbox/Eric\\ Davis/genomes/hg19/bwa/hg19.fa';

    // Stitch command
    var cmd = `${lurePath} -g ${genomePath} -c ${chr} -b ${start} -e ${end} -r ${resEnz} -o ./output`;
    console.log(cmd);

    // Spawn child process to execute command
    var execChild = child.exec(cmd, (error, stdout, stderr) => {
        // console.log(stdout);
    });

    execChild.on('exit', (code, signal) => {
        console.log(`code is ${code} signal is ${signal}`);
        if (parseInt(code) === 0){

            // var file = fs.readFileSync(path.join(__dirname, 'output', 'all_probes.bed'));            
            tsv({
                input: path.join(__dirname, 'output', 'probes.bed'),
                output: path.join(__dirname, 'output', 'probes.json'),
                parseRows: false
            }, (err, result) => {
                if (err) {
                    console.log(err);
                    return null
                } else {
                    // console.log(result);
                    tsv({
                        input: path.join(__dirname, 'output', 'all_fragments.bed'),
                        output: path.join(__dirname, 'output', 'all_fragments.json'),
                        parseRows: false
                    }, (err2, result2) => {
                        if (err2) {
                            console.log(err2);
                            return null
                        } else {
                            console.log(result2);
                            res.send([result, result2]);
                        }
                    })
                }
            })


        }

        else {
            res.status(400).send();
        }
    });

});

// Download results
app.get('/download', (req, res) => {
    console.log("Downloading...");
    var file = fs.readFileSync(path.join(__dirname, 'output', 'all_probes.bed'));
    res.send(file);
});


// Listen on a port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}...`));