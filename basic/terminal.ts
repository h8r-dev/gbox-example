import { GboxClient, Language } from "gbox-sdk";

const gbox = new GboxClient();
const terminal = await gbox.initTerminal();

// Install requests package
const installRes = await terminal.runCommand("pip install requests");
console.log("Install result:", installRes);

const pythonScript = `
import requests

def print_gbox():
    print("Welcome to Gbox Cloud!")
    
    # Make a simple request to get current time
    response = requests.get("https://google.com")
    print("Status Code:", response.status_code)

print_gbox()
`;

const runCodeRes = await terminal.runCode(pythonScript, Language.PYTHON);
console.log(runCodeRes);