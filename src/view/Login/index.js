/** @jsx jsx */
import { jsx, css } from '@emotion/core'
import overmind from '../../overmind'
import { Input, Button, Form } from 'semantic-ui-react'

function Login() {
  const { state, actions } = overmind();
  const myState = state.view.Login;
  const myActions = actions.view.Login;

  return (
    <div css={css`
      height: 100vh;
      width: 100vw;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: url(imgs/login-background.jpg) no-repeat center center fixed;
      background-size: cover;
    `}>
      <div css={css`
        width: 400px;
        display: flex;
        flex-direction: column;
        background: #fff;
        padding: 15px;
        padding-top: 7px;
        border-radius: 5px;
      `}>
        <img css={{
          height: 300
        }} src={`imgs/logo2.svg`} alt={'logo'} />
        <Form css={css`
          display: flex;
          flex-direction: column;
        `} onSubmit={myActions.login}>
          <Input placeholder='OADA Domain...' value={myState.domain} onChange={(evt, data) => myActions.domainChange(data)} />
          <Button
            style={{marginTop: 7}} primary
            loading={myState.loading}
            disabled={myState.loading}>
            Connect to Your OADA Cloud
          </Button>
          <Button
            style={{marginTop: 7}}
            onClick={myActions.viewDemo}
            disabled={myState.loading}>
            View Demo
          </Button>
        </Form>
      </div>
      <a css={css`
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 1.2em;
        color: #FFFFFF;
        cursor: pointer;
      `} onClick={myActions.logout}
      >Logout</a>
    </div>
  );
}

export default Login;
