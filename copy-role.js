const AWS = require("aws-sdk");
const fs = require("fs");
// process.env.AWS_SDK_LOAD_CONFIG = true;
let iam;

(async () => {
  try {
    loadAWSCredentials("lynkk");
    // await listAllRoles();
    const readFile = fs.readFileSync("roles.json");
    const allRoles = JSON.parse(readFile);
    for (let i = 0; i < allRoles.length; i++) {
      loadAWSCredentials("lynkk");
      checkAwsCredentials();
      const sourceRole = await fetchRole(allRoles[i]);
      const inlinePolicies = await fetchInlinePolicies(allRoles[i]);

      console.log({ first: AWS.config.credentials });
      const managedPolicies = await fetchManagedPolicies(allRoles[i]);

      loadAWSCredentials("default");
      await createRoleFromExisting(sourceRole, allRoles[i]);
      console.log({ fourth: AWS.config.credentials });
      if (inlinePolicies.length > 0) {
        await addInlinePolicies(allRoles[i], inlinePolicies);
      }

      if (managedPolicies.length > 0) {
        await addManagedPolicies(allRoles[i], managedPolicies);
      }

      log("\nDone!");
    }
  } catch (e) {
    error(e.message);
  }
})();

async function listAllRoles() {
  try {
    allRoles = await getIam().listRoles().promise();
    const roles = allRoles.Roles.map((role) => role.RoleName);
    const saveToFileAsArray = JSON.stringify(roles, null, 2);
    fs.writeFileSync("roles.json", saveToFileAsArray);
    console.log(roles);
    return roles;
  } catch (e) {
    error(e.message);
  }
}

// function loadArguments() {
//   log("\n--> Parsing arguments from command line...");

//   const cmdArgs = process.argv.slice(2);
//   if (cmdArgs.length !== 2) {
//     throw new TypeError(
//       "<-- Usage: node copy-role.js SOURCE_ROLE_NAME TARGET_ROLE_NAME"
//     );
//   }

//   log(
//     `<-- Arguments loaded. Source role name: ${cmdArgs[0]}, target role name: ${cmdArgs[1]}`
//   );

//   return cmdArgs;
// }

function checkAwsCredentials() {
  log("\n--> Checking if AWS credentials are loaded...");
  if (!AWS.config.credentials) {
    throw new Error(
      `<-- Failed to find AWS credentials. Consider providing them with environment variables.`
    );
  }

  log("<-- AWS credentials found.");
}

async function fetchRole(roleName) {
  log("\n--> Fetching source role...");
  let role;
  try {
    role = (await getIam().getRole({ RoleName: roleName }).promise()).Role;
  } catch (e) {
    throw new Error(`<-- Failed to fetch source role: "${e.message}"`);
  }

  log("<-- Source role loaded.");

  return role;
}

async function fetchInlinePolicies(roleName) {
  log(`\n--> Fetching inline policy names for ${roleName}...`);

  let inlinePolicyNames;
  try {
    inlinePolicyNames = await fetchInlinePoliciesRecursive();
  } catch (e) {
    throw new Error(`<-- Failed to fetch inline policy names: "${e.message}"`);
  }

  log(`<-- Loaded ${inlinePolicyNames.length} inline policy names.`);

  if (inlinePolicyNames.length === 0) {
    return [];
  }

  log("--> Fetching inline policies...");

  let inlinePolies = [];

  try {
    for (const inlinePolicyName of inlinePolicyNames) {
      inlinePolies.push(
        await getIam()
          .getRolePolicy({ RoleName: roleName, PolicyName: inlinePolicyName })
          .promise()
      );
    }
  } catch (e) {
    throw new Error(`<-- Failed to fetch inline policy: "${e.message}"`);
  }

  log(`<-- Loaded inline policies.`);

  return inlinePolies;

  async function fetchInlinePoliciesRecursive(marker) {
    let inlinePolicyNames;

    const response = await getIam()
      .listRolePolicies({ RoleName: roleName, Marker: marker })
      .promise();
    inlinePolicyNames = response.PolicyNames;

    if (response.IsTruncated) {
      inlinePolicyNames = inlinePolicyNames.concat(
        await fetchInlinePoliciesRecursive(response.Marker)
      );
    }

    return inlinePolicyNames;
  }
}

async function fetchManagedPolicies(roleName) {
  log(`\n--> Fetching managed policies for ${roleName}...`);

  let managedPolicies;
  try {
    managedPolicies = await fetchManagedPoliciesRecursive();
  } catch (e) {
    throw new Error(`<-- Failed to fetch managed policies: "${e.message}"`);
  }

  log(`<-- Loaded ${managedPolicies.length} managed policies.`);

  return managedPolicies;

  async function fetchManagedPoliciesRecursive(marker) {
    let managedPolicies;

    const response = await getIam()
      .listAttachedRolePolicies({ RoleName: roleName, Marker: marker })
      .promise();
    managedPolicies = response.AttachedPolicies;

    if (response.IsTruncated) {
      managedPolicies = managedPolicies.concat(
        await fetchManagedPoliciesRecursive(response.Marker)
      );
    }

    const checkRole = await getIam().getRole({ RoleName: roleName }).promise();
    // console.log({ pol });
    console.log({ checkRole });

    return managedPolicies;
  }
}

async function createRoleFromExisting(sourceRole, targetRoleName) {
  log(`\n--> Creating a new role ${targetRoleName}...`);

  console.log({ second: AWS.config.credentials });
  let targetRole;
  try {
    // let pol = [];
    const checkRole = await getIam()
      .getRole({ RoleName: targetRoleName })
      .promise();
    // if (checkRole) {
    //   await fetchInlinePolicies(targetRoleName).then((res) => {
    //     if (res.length > 0) {
    //       pol.push(res[0]);
    //     }
    //   });
    //   await fetchManagedPolicies(targetRoleName).then((res) => {
    //     //   console.log("Pushys", res[0]);
    //     if (res.length > 0) {
    //       pol.push(res[0]);
    //     }
    //   });
    //   for (let i = 0; i < pol.length; i++) {
    //     await getIam()
    //       .detachRolePolicy({
    //         RoleName: targetRoleName,
    //         PolicyArn: pol[i].PolicyArn,
    //       })
    //       .promise();
    //     //  deleteRolePolicy
    //     await getIam()
    //       .deleteRolePolicy({
    //         RoleName: targetRoleName,
    //         PolicyName: pol[i].PolicyName,
    //       })
    //       .promise();
    //   }
    //   // delete the role
    //   await getIam().deleteRole({ RoleName: targetRoleName }).promise();
    // }

    if (!checkRole) {
      targetRole = (
        await getIam()
          .createRole({
            Path: sourceRole.Path,
            RoleName: targetRoleName,
            AssumeRolePolicyDocument: decodeURIComponent(
              sourceRole.AssumeRolePolicyDocument
            ),
            Description: sourceRole.Description,
            MaxSessionDuration: sourceRole.MaxSessionDuration,
            PermissionsBoundary: sourceRole.PermissionsBoundary
              ? sourceRole.PermissionsBoundary.PermissionsBoundaryArn
              : undefined,
            Tags: sourceRole.Tags,
          })
          .promise()
      ).Role;
    }
    console.log({ third: AWS.config.credentials });
  } catch (e) {
    throw new Error(`<-- Failed to create target role: "${e.message}"`);
  }

  log(`<-- Created role ${targetRoleName}.`);

  return targetRole;
}

async function addInlinePolicies(targetRoleName, policies) {
  log(`\n--> Adding inline policies to ${targetRoleName}...`);

  try {
    for (const policy of policies) {
      await getIam()
        .putRolePolicy({
          RoleName: targetRoleName,
          PolicyName: policy.PolicyName,
          PolicyDocument: decodeURIComponent(policy.PolicyDocument),
        })
        .promise();
    }
  } catch (e) {
    throw new Error(`<-- Failed to add inline policies: "${e.message}"`);
  }

  log(`<-- Added ${policies.length} inline policies.`);
}

async function addManagedPolicies(targetRoleName, policies) {
  log(`\n--> Adding managed policies to ${targetRoleName}...`);
  try {
    const checkRole = await getIam()
      .getRole({ RoleName: targetRoleName })
      .promise();
    if (checkRole) {
      for (const policy of policies) {
        await getIam()
          .attachRolePolicy({
            RoleName: targetRoleName,
            PolicyArn: policy.PolicyArn,
          })
          .promise();
      }
    }
  } catch (e) {
    throw new Error(`<-- Failed to add managed policies: "${e.message}"`);
  }

  log(`<-- Added ${policies.length} managed policies.`);
}
// Note: you must have use aws configure --profile <profile-name> to set up your credentials and profile
async function loadAWSCredentials(profileName) {
  log("\n--> Loading AWS credentials...");
  let credentials = new AWS.SharedIniFileCredentials({
    profile: profileName,
  });

  AWS.config.credentials = credentials;
  log("<-- AWS credentials loaded.");
}

function getIam() {
  log("<-- AWS credentials loaded.");
  //   loadAWSCredentials(profileName);
  return (iam = new AWS.IAM());
}

function log(message) {
  console.log(message);
}

function error(message) {
  //   console.log(`
  //               ████████████
  //             ████  ██████████
  //             ████████████████
  //             ████████                                                    ████
  //             ████████████                                                ████
  // ██        ████████                                                      ████
  // ████    ██████████████                                ████        ████  ████  ████
  // ██████████████████  ██                                ████  ██    ████  ████  ████
  // ██████████████████                                    ████  ██    ████  ████  ████
  //   ████████████████                                ██  ████  ██    ████  ████  ████
  //     ████████████                                  ██  ████████    ████████████████
  //       ████████                                    ██  ████          ████████████
  //       ████  ██                                    ████████              ████
  //       ██    ██      ████          ████                ████              ████
  //       ████  ████  ██    ██      ██    ██              ████              ████
  //   ████████████████        ██████        ████████████  ████  ██████████  ████  ████
  //                     ████          ████                ████              ████
  //     ████                    ████        ████                ████  ████
  //                 ████                            ████                          ████
  // `);
  console.error(message);
  process.exitCode = 1;
}
