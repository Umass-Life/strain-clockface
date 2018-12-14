console.log("Opening Settings page");


function mySettings(props) {
  return (
    <Page>
      <Section
        title={<Text bold align="center">STRAIN Login</Text>}>
        <Text>Email: {props.settings.email}</Text>
        <Text>Strain-Id: {props.settings.strainId}</Text>
        <Text>Fitbit-Id: {props.settings.fitbitId}</Text>
        
         <TextInput
          label="enter-email"
          settingsKey="email_input"
        />

         <TextInput
          label="enter-password"
          settingsKey="password_input"
        />
        <Button
          label="login"
          onClick={
            () => {
              
              const email_input = props.settings.email_input
              const password_input = props.settings.password_input
              
              const email_obj = JSON.parse(email_input);
              const email = email_obj.name;
              
              const password_obj = JSON.parse(password_input);
              const password = password_obj.name;

              const data = {
                email: email,
                password: password
              }
              console.log(JSON.stringify(data));
              fetch('https://api.umasslife.net/accounts/login', {
                method: 'POST',
                headers: new Headers({
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                }),
                body: JSON.stringify(data),
                mode: 'cors',
              }).then(function(response) {
                console.log(JSON.stringify(response));
                const result = response.json();
                console.log(result);
                
                return result;
              })
              .then(function(data){ 
                console.log("OK")
                console.log(JSON.stringify(data));
                const fitbitId = data.FitbitUser.fitbitId
                const strainEmail = data.StrainUser.email // should be same as email
                const strainId = data.StrainUser.id
                console.log("??? " + strainId);
                props.settingsStorage.setItem("fitbitId", fitbitId)
                props.settingsStorage.setItem("email", strainEmail)
                props.settingsStorage.setItem("strainId", String(strainId))
                console.log('Request succeeded with response', data.status);
                
              })
              .catch(function(error){ 
                console.log("ERROR: " + error);
                console.log(error.message);
              });
            }
          }
          />
          <Button label="logout"  
            onClick={
              () => {
                const fitbitId = props.settingsStorage.getItem("fitbitId");
                const strainEmail = props.settingsStorage.getItem("email");
                console.log(fitbitId + " " + strainEmail);
                props.settingsStorage.setItem("fitbitId", "")
                props.settingsStorage.setItem("email", "")
                props.settingsStorage.setItem("strainId", "")
                
              }
            }
            />
        
      </Section>
       <Section
        title={<Text bold align="center">DEBUG</Text>}>
        <Text>MSGQ_RECV: {props.settings.MSGQ_RECV}</Text>
        <Text>POST_EMA: {props.settings.POST_EMA}</Text>
        <Text>RECV_EMA_OK: {props.settings.RECV_EMA_OK}</Text>
        <Text>RECV_EMA_ERR: {props.settings.RECV_EMA_ERR}</Text>
         <Text>{JSON.stringify(Object.keys(props.settings))}</Text>
        </Section>
    </Page>
  );
}

registerSettingsPage(mySettings); 