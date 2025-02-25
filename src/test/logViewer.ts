import * as fs from 'fs'
import * as readline from 'readline'
import * as path from 'path'

/**
 * A simple log viewer utility for browsing test output logs
 * This helps with the issue of test output being too large for buffers
 */
async function viewLog() {
    const logFile = path.join(process.cwd(), 'test-output.log')
    
    // Check if log file exists
    if (!fs.existsSync(logFile)) {
        console.error('Log file not found. Run tests first with npm run test:vscode')
        process.exit(1)
    }

    // Read the log file
    const fileStream = fs.createReadStream(logFile)
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    })

    // Store lines for pagination
    const lines: string[] = []
    for await (const line of rl) {
        lines.push(line)
    }

    // Set up pagination
    const pageSize = 20
    let currentPage = 0
    const totalPages = Math.ceil(lines.length / pageSize)

    // Display instructions
    console.log('\n=== Test Log Viewer ===')
    console.log('Commands:')
    console.log('  n: Next page')
    console.log('  p: Previous page')
    console.log('  g <num>: Go to page')
    console.log('  f <text>: Find text')
    console.log('  q: Quit')
    console.log('=====================\n')

    // Display initial page
    displayPage(lines, currentPage, pageSize, totalPages)

    // Set up user input
    const userInput = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'Command> '
    })

    userInput.prompt()

    userInput.on('line', (line) => {
        const input = line.trim().toLowerCase()
        
        if (input === 'q') {
            userInput.close()
            process.exit(0)
        } else if (input === 'n') {
            if (currentPage < totalPages - 1) {
                currentPage++
                displayPage(lines, currentPage, pageSize, totalPages)
            } else {
                console.log('Already at the last page')
            }
        } else if (input === 'p') {
            if (currentPage > 0) {
                currentPage--
                displayPage(lines, currentPage, pageSize, totalPages)
            } else {
                console.log('Already at the first page')
            }
        } else if (input.startsWith('g ')) {
            const pageNum = parseInt(input.substring(2), 10)
            if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
                console.log(`Invalid page number. Enter a number between 1 and ${totalPages}`)
            } else {
                currentPage = pageNum - 1
                displayPage(lines, currentPage, pageSize, totalPages)
            }
        } else if (input.startsWith('f ')) {
            const searchText = input.substring(2).toLowerCase()
            const results = findText(lines, searchText)
            if (results.length === 0) {
                console.log(`No matches found for "${searchText}"`)
            } else {
                console.log(`Found ${results.length} matches:`)
                for (let i = 0; i < Math.min(10, results.length); i++) {
                    const { lineNum, line } = results[i]
                    console.log(`Line ${lineNum + 1}: ${line}`)
                }
                if (results.length > 10) {
                    console.log(`... and ${results.length - 10} more matches`)
                }
                console.log('\nUse "g <line number>" to go to a specific line')
            }
        } else {
            console.log('Unknown command. Use n, p, g <num>, f <text>, or q')
        }
        
        userInput.prompt()
    })
}

/**
 * Display a page of log lines
 */
function displayPage(lines: string[], page: number, pageSize: number, totalPages: number) {
    console.clear()
    const start = page * pageSize
    const end = Math.min(start + pageSize, lines.length)
    
    console.log(`=== Page ${page + 1} of ${totalPages} (Lines ${start + 1}-${end} of ${lines.length}) ===\n`)
    
    for (let i = start; i < end; i++) {
        console.log(`${i + 1}: ${lines[i]}`)
    }
    
    console.log('\n=== End of Page ===')
}

/**
 * Find text in log lines
 */
function findText(lines: string[], searchText: string): { lineNum: number, line: string }[] {
    const results: { lineNum: number, line: string }[] = []
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(searchText)) {
            results.push({ lineNum: i, line: lines[i] })
        }
    }
    
    return results
}

// Run the log viewer
viewLog().catch(err => {
    console.error('Error viewing log:', err)
    process.exit(1)
})