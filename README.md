INSTALLATION AND USAGE
---

1. Install [node](https://nodejs.org/en/download/) (latest tested/working with node v6.4.0).
- Clone or download the oada-api-server from [Github](https://github.com/OADA/oada-api-server).
- Navigate to inside the root directory of oada-api-server.
- Run `npm install` to install dependancies. 
- Run `DEMO=TrialsTracker npm start` to start the OADA server with demo data for TrialsTracker.
- Next we need to trust the self signed ssl certificate from our OADA server that is now running locally on port 3000. Below are the instructions to do this on Google Chrome.

	1. Navigate to [link](https://localhost:3000/.well-known/oada-configuration) in your browser.
	- Click 'ADVANCED'.
	- Click 'Proceed to localhost (unsafe)'
- Leave the oada-api-server running and start another terminal.
- Clone or download the TrialsTracker web application from [Github](https://github.com/OpenATK/TrialsTracker).
- Navigate to inside the root directory of TrialsTracker.
- Run `npm install` to install dependancies.
- Install webpack globally. `npm install -g webpack` may have to install with sudo depending on your system configuration. (latest tested/working v1.13.2)
- Run `webpack` to build the application.
- Run `npm start` to start a webserver locally on port 8000 to serve the web application.
- Navigate to [link](http://localhost:8000) in your browser.
- If popups are blocked by your browser, allow them and refresh.
- Press 'Submit' in the popup window that appears.
- Press 'Allow' to allow the TrialsTracker to access the sample data hosted on the oada-api-server that is running on port 3000.
- All done. You should see some yield data loaded in the center of your screen.