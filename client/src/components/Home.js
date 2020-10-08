import React, { Component } from "react";
import { Link } from "react-router-dom";

class Greeting extends Component {
	render() {
		if (this.props.user) {
			return (
				<div id="greeting">
					<h1>Welcome Back {this.props.user.username}</h1>
				</div>
			)
		} else {
			return (
				<div id="greeting">
					<h1>Welcome</h1>
					<p className="textMuted">Your are not <Link to="/login">logged in</Link></p>
				</div>
			)
		}
	}
}


export default class Home extends Component {
	constructor() {
		super();
		this.state = {
			user: false
		}
	}

	async componentDidMount() {
		fetch('/checkAuthenticated')
			.then(r => r.json())
			.then(res => {
				console.log(res);
				this.setState({user: res.user});
			});
	}

	render() {
		return (
			<div className="home">
				<div className="container">
					<div className="row align-items-center my-5">
						<div className="col-lg-6 mx-auto">
							<Greeting user={this.state.user} />
							<div id="transcriptions"></div>
						</div>
					</div>
				</div>
			</div>
		);
	}
}
