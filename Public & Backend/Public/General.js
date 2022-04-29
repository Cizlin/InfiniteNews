// Filename: public/General.js

// Code written in public files is shared by your site's
// Backend, page code, and site code environments.

// Use public files to hold utility functions that can
// be called from multiple locations in your site's code.
export function getLongMonthDayYearFromDate(date) {
	let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let monthString = months[date.getMonth()];

    let dayString = (date.getDate() < 10) ? ("0" + date.getDate().toString()) : date.getDate().toString();
    let yearString = date.getFullYear().toString();

    return monthString + " " + dayString + ", " + yearString;
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
