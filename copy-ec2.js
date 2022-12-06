const AWS = require("aws-sdk");
const fs = require("fs");

async function loadAWSCredentials(profileName) {
  log("\n--> Loading AWS credentials...");
  let credentials = new AWS.SharedIniFileCredentials({
    profile: profileName,
  });

  AWS.config.credentials = credentials;
  //   console.log(AWS.config.credentials);
  log("<-- AWS credentials loaded.");
}

// Name
// OS name
// OS Version
// IP address
// AWS Account
// Description

// List all EC2 instances from all regions
(async () => {
  await loadAWSCredentials("production");
  const ec2 = new AWS.EC2({
    region: "eu-west-2",
  });
  const listRegions = await ec2.describeRegions().promise();
  let regions = listRegions.Regions.map((region) => region.RegionName);
  for (let i = 0; i < regions.length; i++) {
    const getInstancesinFromEachRegion = await ec2
      .describeInstances({
        Filters: [
          {
            Name: "instance-state-name",
            Values: ["running"],
          },
        ],
      })
      .promise();
    getInstancesinFromEachRegion.Reservations.forEach((reservation) => {
      reservation.Instances.forEach((instance) => {
        fs.appendFile(
          "ec2-instances.json",
          JSON.stringify(instance, null, 2),
          (err) => {
            if (err) {
              console.log(err);
            }
          }
        );
      });
    });
  }
})();

function log(message) {
  console.log(message);
}

//   regions.forEach(async (region) => {
//     const getInstancesinRegion = await ec2
//       .describeInstances({
//         Filters: [
//           {
//             Name: "instance-state-name",
//             Values: ["running"],
//           },
//         ],
//       })
//       .promise();
//     getInstancesinRegion.Reservations.forEach((reservation) => {
//       reservation.Instances.forEach((instance) => {
//         fs.appendFile(
//           "ec2-instances.json",
//           JSON.stringify(instance, null, 2),
//           (err) => {
//             if (err) {
//               console.log(err);
//             }
//           }
//         );
//       });
//     });
//   });
