/**
 * Digilayn Developer Fingerprint
 * Built by Musa Mgijima
 */

(function () {
    const fingerprint = `
██████╗ ██╗ ██████╗ ██╗██╗      █████╗ ██╗   ██╗███╗   ██╗
██╔══██╗██║██╔════╝ ██║██║     ██╔══██╗╚██╗ ██╔╝████╗  ██║
██║  ██║██║██║  ███╗██║██║     ███████║ ╚████╔╝ ██╔██╗ ██║
██║  ██║██║██║   ██║██║██║     ██╔══██║  ╚██╔╝  ██║╚██╗██║
██████╔╝██║╚██████╔╝██║███████╗██║  ██║   ██║   ██║ ╚████║
╚═════╝ ╚═╝ ╚═════╝ ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═══╝

Built by Musa Mgijima
https://digilayn.co.za
`;

    console.log(
        "%c" + fingerprint,
        `color:${window.DigilaynTheme.getColor("primary")};font-weight:bold;`
    );

    console.log(
        "%cCuriosity is good. Building is better 🙂",
        `color:${window.DigilaynTheme.getColor("primary")};font-style:italic;`
    );

    document.addEventListener("keydown", function (e) {
        const blocked =
            e.key === "F12" ||
            (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
            (e.ctrlKey && e.key.toUpperCase() === "U") ||
            (e.metaKey && e.altKey && e.key.toUpperCase() === "I");

        if (blocked) {
            e.preventDefault();
        }
    });
})();
