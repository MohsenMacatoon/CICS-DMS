# CICS-DMS (Prototype)

CICS-DMS: A Web-Based Document Management System for CICS, MSU-Main Campus.

It stores official issuances (memoranda, special orders, notices of meeting) and personnel records (faculty teaching loads, service records) for faculty and staff of the College of Information and Computing Sciences.

This is a front-end prototype for capstone evaluation. All data is saved in the browser only.

## Demo accounts

| Role | Username | Password |
|---|---|---|
| Records Officer (Administrator) | records | admin123 |
| Faculty (Regular user) | jdelacruz | faculty123 |
| Faculty (Regular user) | mgarcia | faculty123 |

## Project structure

```
cics-dms/
├── index.html        Page layout
├── css/
│   └── style.css     Colors, layout, and components
└── js/
    ├── config.js     Document categories, settings, and helpers
    ├── data.js       Sample data, browser storage, and access rules
    └── app.js        Screens, navigation, and user actions
```

## Run locally

Double-click `index.html`. No installation or internet needed.

## Publish on GitHub Pages

1. Upload all files and folders to a GitHub repository, keeping the same structure.
2. Go to Settings > Pages.
3. Under "Branch", choose `main` and `/ (root)`, then click Save.
4. After a minute, the site is live at `https://<username>.github.io/<repository>/`.
