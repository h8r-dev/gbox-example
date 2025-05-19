import { GboxClient, Language } from "gbox-sdk";

const gbox = new GboxClient();
const terminal = await gbox.initTerminal();

// Install playwright package
const installRes = await terminal.runCommand("pip install playwright && playwright install");
console.log("Install result:", installRes);

const pythonScript = `
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch()
        page = browser.new_page()
        
        # Navigate to Google
        page.goto("https://www.google.com")
        print("Page title:", page.title())
        
        # Close browser
        browser.close()

if __name__ == "__main__":
    run_test()
`;

const runCodeRes = await terminal.runCode(pythonScript, Language.PYTHON);
console.log(runCodeRes);