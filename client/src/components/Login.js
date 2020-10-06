import React, { Component } from "react";
import { Link } from "react-router-dom";

export default class Login extends Component {
	constructor(props) {
		super();
		this.state = {
			username: "",
			password: "",
		};

		this.onSubmit = this.onSubmit.bind(this);
	}

	async onSubmit(event) {
		event.preventDefault();

		const data = {
			username: this.state.username,
			password: this.state.password,
		};

		fetch("/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		})
			// .then((res) => res.status)
			// .then((status) => {
			// 	if (status === 201) {
					
			// 	} else {
			// 		// @TODO implement retry to login if acc already exists...
			// 		alert("");
			// 	}
			// });
	}

	render() {
		return (
			<div className="container login col-md-2">
				<form onSubmit={this.onSubmit}>
					<h1>Log in</h1>

					<div className="form-group">
						<label for="username">Username</label>
						<input
							name="username"
							className="form-control"
							type="text"
							placeholder="Username"
							required
							value={this.state.username}
							onChange={(e) => this.setState({ username: e.target.value })}
						></input>
					</div>

					<div className="form-group">
						<label for="password">Password</label>
						<input
							name="password"
							className="form-control"
							type="password"
							placeholder="Password"
							required
							value={this.state.password}
							onChange={(e) => this.setState({ password: e.target.value })}
						></input>
					</div>

					<button type="submit" className="btn btn-primary">
						Log in
					</button>
				</form>
				<p className="text-muted">
					or <Link to="/register">Register Instead</Link>
				</p>
			</div>
		);
	}
}
