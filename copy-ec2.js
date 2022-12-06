const AWS = require("aws-sdk");
const { error } = require("console");
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

// List all EC2 instances from all regions
(async () => {
  await loadAWSCredentials("production");
  let ec2 = new AWS.EC2({ apiVersion: "2016-11-15", region: "eu-west-2" });
  const regions = await ec2.describeRegions().promise();

  regions.Regions.forEach(async (region) => {
    let newEC2 = new AWS.EC2({
      apiVersion: "2016-11-15",
      region: region.RegionName,
    });
    const foundInstances = await newEC2
      .describeInstances({
        Filters: [
          {
            Name: "instance-state-name",
            Values: ["running"],
          },
        ],
      })
      .promise();
    if (foundInstances.Reservations.length > 0) {
      for (let i = 0; i < foundInstances.Reservations.length; i++) {
        const instance = foundInstances.Reservations[i].Instances[0];
        // apend to file and add comma at the end

        fs.appendFile(
          "ec2-instances.json",
          JSON.stringify(
            {
              Name: instance.Tags[0].Value,
              OS: instance.ImageId,
              PrivateIpAddress: instance.PrivateIpAddress,
              PublicIpAddress: instance.PublicIpAddress,
              InstanceId: instance.InstanceId,
              AwsRegion: region.RegionName,
              AwsAccount: AWS.config.credentials.accessKeyId,
            },
            null,
            2
          ) + ",",
          (err) => {
            if (err) {
              console.log(err);
            }
          }
        );
      }
    }
  });
  //   const getInstances = await ec2.describeInstances().promise();
  // get all ec2 instances

  //   console.log(getInstances);

  //   get all regions
  //   check if an ec2 instance is running in a region
  //   regions.Regions.forEach(async (region) => {
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
  //         fs.writeFile(
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
