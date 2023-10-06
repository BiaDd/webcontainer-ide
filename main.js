import "./style.css";
import "xterm/css/xterm.css";
import { files } from "./files";
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

/** @type {HTMLIFrameElement | null} */
const iframeEl = document.querySelector("iframe");

/** @type {HTMLTextAreaElement | null} */
const textareaEl = document.querySelector("textarea");

/** @type {HTMLTextAreaElement | null} */
const terminalEl = document.querySelector(".terminal");

/** @type {import('@webcontainer/api').WebContainer}  */
let webcontainerInstance;

window.addEventListener("load", async () => {
  displayFilesinFiletree(files);
  document.getElementById("index.js").setAttribute("class", "file-item selected");
  var selectedFile = document.querySelector(".file-item.selected").id;
  textareaEl.value = files[selectedFile].file.contents;
  textareaEl.addEventListener("input", (e) => {
    writeFile(selectedFile, e.currentTarget.value);
  });

  const fitAddon = new FitAddon();

  const terminal = new Terminal({
    convertEol: true,
  });

  terminal.loadAddon(fitAddon);
  terminal.open(terminalEl);
  fitAddon.fit();

  // Call only once
  webcontainerInstance = await WebContainer.boot();
  await webcontainerInstance.mount(files);

  // Wait for `server-ready` event
  webcontainerInstance.on("server-ready", (port, url) => {
    iframeEl.src = url;
  });

  const shellProcess = await startShell(terminal);
  window.addEventListener("resize", () => {
    fitAddon.fit();
    shellProcess.resize({
      cols: terminal.cols,
      rows: terminal.rows,
    });
  });
});

/** @param {string} content*/
async function writeFile(fileName, content) {
  await webcontainerInstance.fs.writeFile("/"+fileName, content);
}

/**
 * @param {Terminal} terminal
 */
async function startShell(terminal) {
  const shellProcess = await webcontainerInstance.spawn("jsh", {
    terminal: {
      cols: terminal.cols,
      rows: terminal.rows,
    },
  });
  shellProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );

  const input = shellProcess.input.getWriter();

  terminal.onData((data) => {
    input.write(data);
  });

  return shellProcess;
}

/**
 * @param {Object} files
 */
async function displayFilesinFiletree(files) {
  var filetree = document.querySelector(".filetree");
  var ul = document.createElement("ul");
  ul.setAttribute("class", "filelist");
  for (const file in files) {
    var li = document.createElement("li");
    li.innerHTML = file;
    li.setAttribute("class", "file-item"); // remove the bullets.

    li.setAttribute("id", file);
    ul.appendChild(li); // append li to ul.
  }

  filetree.appendChild(ul);
}
