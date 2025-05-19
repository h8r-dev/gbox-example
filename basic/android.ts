import { GboxClient } from "gbox-sdk";
import * as fs from 'fs';
import * as readline from 'readline';
import open from 'open';

const gbox = new GboxClient();

// Initialize Android box (default lifecycle: 5 minutes, will be automatically released after 5 minutes)
const android = await gbox.initAndroid();
// Or you can use an existing simulator directly
//const android = await gbox.initAndroid("2f85cd9e-b314-45f3-ab13-5bcc57dacaf2")
console.log("gbox id: ", android.sandboxId)

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Prompt user and wait for enter key
await new Promise<void>((resolve) => {
    rl.question('Press enter to open browser and view real-time operations: [enter]?', () => {
        rl.close();
        resolve();
    });
});

// Construct URL with dynamic sandboxId
const url = `https://gboxes.app/api/v1/proxy/${android.sandboxId}/#!action=stream&udid=localhost:5555&player=mse&ws=wss%3A%2F%2Fgboxes.app%2Fapi%2Fv1%2Fproxy%2F${android.sandboxId}%2F%3Faction%3Dproxy-adb%26remote%3Dtcp%253A8886%26udid%3Dlocalhost%253A5555`;

// Open browser
await open(url);

// Wait for 5 seconds to let user see the effect
console.log('Waiting 5 seconds before continuing...');
await new Promise(resolve => setTimeout(resolve, 5000));

// Keypress: support type: enter, delete, back, home, space, up, down, left, right, menu
// Return to home and press back to ensure we can click the Google search input
await android.keypress("home");
await android.keypress("back");

// Click at specified X Y position (Google Search)
await android.click(500, 2760);

// Input content, limitation: only supports English input
await android.type("gbox%scloud");

// Keypress: support type: enter, delete, back, home, space, up, down, left, right, menu
await android.keypress("enter");

// Drag is mainly used to simulate gesture operations, such as switching desktops or pulling out system menu bars
// Note: Set a reasonable duration (in milliseconds) - too short duration may cause the gesture to fail
// Example: Drag and show application center

// await android.drag([500, 1000], [500, 400], 800);

// wait for 3 sec
await new Promise(resolve => setTimeout(resolve, 3000));

// Returns screenshot as base64 encoded string
const screenshot = await android.screenshot();

// You can save screenshot as PNG file
const base64Data = screenshot.replace(/^data:image\/png;base64,/, '');
fs.writeFileSync('screenshot.png', base64Data, 'base64');
console.log("screenshot.png saved!")

// Get screen dimensions, returns width*height
const screenSize = await android.getDeviceScreenSize()
console.log(screenSize)