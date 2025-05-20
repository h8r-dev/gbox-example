import { GboxClient } from "gbox-sdk";
import * as fs from 'fs';
import * as path from 'path';
import { OpenAI } from 'openai';
import * as readline from 'readline';
import open from 'open';

// Initialize OpenAI client
const client = new OpenAI();

// Add step counter at module level
let stepCounter = 0;

// Create screenshots directory if it doesn't exist
const screenshotsDir = 'screenshots';
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
}

async function connectAndroidDevice(): Promise<boolean> {
    try {
        const gbox = new GboxClient();
        const android = await gbox.initAndroid();
        console.log("Connected to Android device, gbox id:", android.sandboxId);
        return true;
    } catch (e) {
        console.error("Error connecting to Android device:", e);
        return false;
    }
}

async function getScreenshot(android: any): Promise<string | null> {
    try {
        stepCounter++;
        const filename = path.join(screenshotsDir, `step-${stepCounter}.png`);

        // Get screenshot using Gbox SDK
        const screenshot = await android.screenshot();

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Save screenshot to file
        const base64Data = screenshot.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(filename, base64Data, 'base64');

        // Return the base64 data URL directly
        return `data:image/png;base64,${base64Data}`;
    } catch (e) {
        console.error("Error taking screenshot:", e);
        return null;
    }
}

async function getDeviceScreenSize(android: any): Promise<[number, number] | null> {
    try {
        const screenSize = await android.getDeviceScreenSize();
        return screenSize;
    } catch (e) {
        console.error("Error getting screen size:", e);
        return null;
    }
}

async function handleModelAction(android: any, action: any) {
    const actionType = action.type;

    try {
        switch (actionType) {
            case "click":
                const { x, y, button } = action;
                console.log(`Clicking at position (${x}, ${y}), button '${button}'`);
                await android.click(x, y);
                break;

            case "scroll":
                const { x: scrollX, y: scrollY, scroll_x, scroll_y } = action;
                console.log(`Scrolling from (${scrollX}, ${scrollY}) to (${scrollX + scroll_x}, ${scrollY + scroll_y})`);
                await android.drag([scrollX, scrollY], [scrollX + scroll_x, scrollY + scroll_y], 1000);
                break;

            case "keypress":
                const { keys } = action;
                for (const k of keys) {
                    console.log(`Pressing key: '${k}'`);
                    await android.keypress(k.toLowerCase());
                }
                break;

            case "type":
                const { text } = action;
                console.log(`Typing text: ${text}`);
                await android.type(text);
                break;

            case "wait":
                console.log("Waiting...");
                await new Promise(resolve => setTimeout(resolve, 2000));
                break;

            case "drag":
                const { path: dragPath } = action;
                const [startPoint, endPoint] = dragPath;
                console.log(`Dragging from (${startPoint.x}, ${startPoint.y}) to (${endPoint.x}, ${endPoint.y})`);
                await android.drag([startPoint.x, startPoint.y], [endPoint.x, endPoint.y], 1000);
                break;

            case "screenshot":
                console.log("Taking screenshot");
                await getScreenshot(android);
                break;

            default:
                console.log(`Unknown action type: ${actionType}`);
        }
    } catch (e) {
        console.error(`Error handling action ${actionType}:`, e);
    }
}

async function computerUseLoop(android: any, response: any) {
    while (true) {
        // Find all computer calls
        const computerCalls = response.output.filter((item: any) => item.type === "computer_call");
        if (!computerCalls.length) {
            for (const item of response.output) {
                console.log(item);
            }
            break;
        }

        const computerCall = computerCalls[0];
        const lastCallId = computerCall.call_id;
        const action = computerCall.action;

        await handleModelAction(android, action);

        // Wait for action to take effect
        await new Promise(resolve => setTimeout(resolve, 1000));

        const screenshot = await getScreenshot(android);
        if (screenshot) {
            // const screenSize = await getDeviceScreenSize(android);
            // if (!screenSize) break;
            // const [width, height] = screenSize;

            // Continue with model request
            response = await client.responses.create({
                model: "computer-use-preview",
                previous_response_id: response.id,
                tools: [{
                    type: "computer-preview",
                    display_width: 1440,
                    display_height: 3040,
                    environment: "browser"
                }],
                input: [{
                    call_id: lastCallId,
                    type: "computer_call_output",
                    output: {
                        type: "computer_screenshot",
                        image_url: screenshot
                    }
                }],
                truncation: "auto"
            });
        } else {
            console.log("Failed to take screenshot");
            break;
        }
    }

    return response;
}

async function main() {
    const gbox = new GboxClient();
    const android = await gbox.initAndroid();
    console.log("gbox id: ", android.sandboxId);

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
    console.log('Waiting 1 seconds before continuing...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!android) {
        console.log("Failed to connect to Android");
        return;
    }

    // Get initial screenshot
    const screenshot = await getScreenshot(android);
    if (!screenshot) {
        console.log("Failed to get screenshot");
        return;
    }

    // Initial model request
    const response = await client.responses.create({
        model: "computer-use-preview",
        tools: [{
            type: "computer-preview",
            display_width: 1440,
            display_height: 3040,
            environment: "browser"
        }],
        input: [{
            role: "user",
            content: [
                {
                    type: "input_text",
                    text: "打开Chrome，并搜索GBOX"
                },
                {
                    type: "input_image",
                    image_url: screenshot,
                    detail: "high"
                }
            ]
        }],
        reasoning: {
            summary: "concise",
        },
        truncation: "auto"
    });

    // Start the loop
    const finalResponse = await computerUseLoop(android, response);
    console.log(finalResponse.output);
}

// Run the main function
main().catch(console.error);
