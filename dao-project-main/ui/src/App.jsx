import { useState, useEffect } from "react";
import { Contract, BrowserProvider } from "ethers";
import { id } from "@ethersproject/hash";

import {
  CertAddr,
  MyGovernorAddr,
  GovTokenAddr,
  TimeLockAddr,
} from "./contract-data/deployedAddresses.json";
import { abi as Govabi } from "./contract-data/MyGovernor.json";
import { abi as Certabi } from "./contract-data/Cert.json";
import { abi as TokenAbi } from "./contract-data/GovToken.json";
import { abi as TimeLockAbi } from "./contract-data/TimeLock.json";

// MUI Components
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Container,
  Paper,
  Grid,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ padding: '20px 0' }}>
      {value === index && children}
    </div>
  );
}

function App() {
  // State variables
  const [loginState, setLoginState] = useState("Connect Wallet");
  const [userAddress, setUserAddress] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tabValue, setTabValue] = useState(0);

  // Token Management
  const [mintAmount, setMintAmount] = useState("");
  const [mintToAddress, setMintToAddress] = useState("");
  const [delegateAddress, setDelegateAddress] = useState("");
  const [tokenBalance, setTokenBalance] = useState("0");

  // Role Management
  const [proposerRole, setProposerRole] = useState("");
  const [executorRole, setExecutorRole] = useState("");

  // Proposal Management
  const [proposals, setProposals] = useState([]);
  const [newProposalOpen, setNewProposalOpen] = useState(false);
  const [proposalDescription, setProposalDescription] = useState("");
  const [proposalFunction, setProposalFunction] = useState("");
  const [proposalParams, setProposalParams] = useState("");

  // Certificate Management
  const [certificates, setCertificates] = useState([]);

  const provider = new BrowserProvider(window.ethereum);

  // Connect Wallet
  const connectWallet = async () => {
    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setUserAddress(address);
      setLoginState("Connected: " + address.slice(0, 6) + "..." + address.slice(-4));
      await checkAdminStatus(address);
      await getTokenBalance(address);
      setSuccess("Wallet connected successfully!");
    } catch (err) {
      setError("Failed to connect wallet: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Token Functions
  const mintTokens = async () => {
    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const tokenContract = new Contract(GovTokenAddr, TokenAbi, signer);
      const tx = await tokenContract.mint(mintToAddress || userAddress, mintAmount);
      await tx.wait();
      setSuccess("Tokens minted successfully!");
      await getTokenBalance(userAddress);
    } catch (err) {
      setError("Failed to mint tokens: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const delegateTokens = async () => {
    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const tokenContract = new Contract(GovTokenAddr, TokenAbi, signer);
      const tx = await tokenContract.delegate(delegateAddress || userAddress);
      await tx.wait();
      setSuccess("Tokens delegated successfully!");
    } catch (err) {
      setError("Failed to delegate tokens: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTokenBalance = async (address) => {
    try {
      const tokenContract = new Contract(GovTokenAddr, TokenAbi, provider);
      const balance = await tokenContract.balanceOf(address);
      setTokenBalance(balance.toString());
    } catch (err) {
      console.error("Failed to get token balance:", err);
    }
  };

  // Role Management Functions
  const grantProposerRole = async () => {
    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const timeLockContract = new Contract(TimeLockAddr, TimeLockAbi, signer);
      const PROPOSER_ROLE = await timeLockContract.PROPOSER_ROLE();
      const tx = await timeLockContract.grantRole(PROPOSER_ROLE, proposerRole);
      await tx.wait();
      setSuccess("Proposer role granted successfully!");
    } catch (err) {
      setError("Failed to grant proposer role: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const grantExecutorRole = async () => {
    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const timeLockContract = new Contract(TimeLockAddr, TimeLockAbi, signer);
      const EXECUTOR_ROLE = await timeLockContract.EXECUTOR_ROLE();
      const tx = await timeLockContract.grantRole(EXECUTOR_ROLE, executorRole);
      await tx.wait();
      setSuccess("Executor role granted successfully!");
    } catch (err) {
      setError("Failed to grant executor role: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkAdminStatus = async (address) => {
    try {
      const timeLockContract = new Contract(TimeLockAddr, TimeLockAbi, provider);
      const ADMIN_ROLE = await timeLockContract.DEFAULT_ADMIN_ROLE();
      const hasRole = await timeLockContract.hasRole(ADMIN_ROLE, address);
      setIsAdmin(hasRole);
    } catch (err) {
      console.error("Failed to check admin status:", err);
    }
  };

  // Proposal Functions
  const createProposal = async () => {
    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const govContract = new Contract(MyGovernorAddr, Govabi, signer);
      const certContract = new Contract(CertAddr, Certabi, signer);

      // Example parameters for certificate issuance
      const params = JSON.parse(proposalParams);
      const calldata = certContract.interface.encodeFunctionData(proposalFunction, params);

      const tx = await govContract.propose(
        [CertAddr],
        [0],
        [calldata],
        proposalDescription
      );
      await tx.wait();
      setSuccess("Proposal created successfully!");
      setNewProposalOpen(false);
      await getProposals();
    } catch (err) {
      setError("Failed to create proposal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getProposals = async () => {
    try {
      const govContract = new Contract(MyGovernorAddr, Govabi, provider);
      const filter = govContract.filters.ProposalCreated();
      const events = await govContract.queryFilter(filter);
      
      const proposalDetails = await Promise.all(events.map(async (event) => {
        const state = await govContract.state(event.args[0]);
        return {
          id: event.args[0].toString(),
          description: event.args[8],
          state: ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'][state]
        };
      }));
      
      setProposals(proposalDetails);
    } catch (err) {
      console.error("Failed to get proposals:", err);
    }
  };

  const castVote = async (proposalId, support) => {
    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const govContract = new Contract(MyGovernorAddr, Govabi, signer);
      const tx = await govContract.castVote(proposalId, support);
      await tx.wait();
      setSuccess("Vote cast successfully!");
      await getProposals();
    } catch (err) {
      setError("Failed to cast vote: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const queueProposal = async (proposalId, description) => {
    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const govContract = new Contract(MyGovernorAddr, Govabi, signer);
      const descriptionHash = id(description);
      const tx = await govContract.queue(
        [CertAddr],
        [0],
        ["0x"],
        descriptionHash
      );
      await tx.wait();
      setSuccess("Proposal queued successfully!");
      await getProposals();
    } catch (err) {
      setError("Failed to queue proposal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeProposal = async (proposalId, description) => {
    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const govContract = new Contract(MyGovernorAddr, Govabi, signer);
      const descriptionHash = id(description);
      const tx = await govContract.execute(
        [CertAddr],
        [0],
        ["0x"],
        descriptionHash
      );
      await tx.wait();
      setSuccess("Proposal executed successfully!");
      await getProposals();
    } catch (err) {
      setError("Failed to execute proposal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Certificate Functions
  const getCertificates = async () => {
    try {
      const certContract = new Contract(CertAddr, Certabi, provider);
      const filter = certContract.filters.CertificateIssued();
      const events = await certContract.queryFilter(filter);
      const certDetails = await Promise.all(events.map(async (event) => {
        const cert = await certContract.certificates(event.args.certificateId);
        return {
          id: event.args.certificateId.toString(),
          name: cert.name,
          course: cert.course,
          grade: cert.grade,
          date: cert.date
        };
      }));
      setCertificates(certDetails);
    } catch (err) {
      console.error("Failed to get certificates:", err);
    }
  };

  // Effect Hooks
  useEffect(() => {
    getProposals();
    getCertificates();
  }, []);

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* App Bar */}
      <AppBar position="static" sx={{ mb: 3 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            DAO Certificate Manager
          </Typography>
          <Button color="inherit" onClick={connectWallet} disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : loginState}
          </Button>
        </Toolbar>
      </AppBar>

      <Container>
        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        {/* Main Content */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} centered>
            <Tab label="Dashboard" />
            <Tab label="Proposals" />
            <Tab label="Certificates" />
            {isAdmin && <Tab label="Admin" />}
          </Tabs>

          {/* Dashboard Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Your DAO Token Balance: {tokenBalance}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="Delegate Address (optional)"
                      value={delegateAddress}
                      onChange={(e) => setDelegateAddress(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      onClick={delegateTokens}
                      disabled={loading || !userAddress}
                    >
                      Delegate Tokens
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Proposals Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                onClick={() => setNewProposalOpen(true)}
                disabled={loading || !userAddress}
              >
                Create New Proposal
              </Button>
            </Box>
            <Grid container spacing={3}>
              {proposals.map((proposal) => (
                <Grid item xs={12} key={proposal.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Proposal #{proposal.id.slice(0, 8)}...
                      </Typography>
                      <Typography color="textSecondary" gutterBottom>
                        {proposal.description}
                      </Typography>
                      <Chip
                        label={proposal.state}
                        color={
                          proposal.state === "Active" ? "primary" :
                          proposal.state === "Succeeded" ? "success" :
                          proposal.state === "Executed" ? "secondary" :
                          "default"
                        }
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                    <CardActions>
                      {proposal.state === "Active" && (
                        <>
                          <Button size="small" onClick={() => castVote(proposal.id, 1)}>
                            Vote For
                          </Button>
                          <Button size="small" onClick={() => castVote(proposal.id, 0)}>
                            Vote Against
                          </Button>
                        </>
                      )}
                      {proposal.state === "Succeeded" && (
                        <Button size="small" onClick={() => queueProposal(proposal.id, proposal.description)}>
                          Queue
                        </Button>
                      )}
                      {proposal.state === "Queued" && (
                        <Button size="small" onClick={() => executeProposal(proposal.id, proposal.description)}>
                          Execute
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Certificates Tab */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              {certificates.map((cert) => (
                <Grid item xs={12} sm={6} md={4} key={cert.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Certificate #{cert.id}
                      </Typography>
                      <Typography><strong>Name:</strong> {cert.name}</Typography>
                      <Typography><strong>Course:</strong> {cert.course}</Typography>
                      <Typography><strong>Grade:</strong> {cert.grade}</Typography>
                      <Typography><strong>Date:</strong> {cert.date}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Admin Tab */}
          {isAdmin && (
            <TabPanel value={tabValue} index={3}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Token Management
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Address to Mint"
                          value={mintToAddress}
                          onChange={(e) => setMintToAddress(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Amount to Mint"
                          type="number"
                          value={mintAmount}
                          onChange={(e) => setMintAmount(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          variant="contained"
                          onClick={mintTokens}
                          disabled={loading}
                        >
                          Mint Tokens
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Role Management
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Address for Proposer Role"
                          value={proposerRole}
                          onChange={(e) => setProposerRole(e.target.value)}
                        />
                        <Button
                          variant="contained"
                          onClick={grantProposerRole}
                          disabled={loading}
                          sx={{ mt: 1 }}
                        >
                          Grant Proposer Role
                        </Button>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Address for Executor Role"
                          value={executorRole}
                          onChange={(e) => setExecutorRole(e.target.value)}
                        />
                        <Button
                          variant="contained"
                          onClick={grantExecutorRole}
                          disabled={loading}
                          sx={{ mt: 1 }}
                        >
                          Grant Executor Role
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
          )}
        </Paper>

        {/* New Proposal Dialog */}
        <Dialog open={newProposalOpen} onClose={() => setNewProposalOpen(false)}>
          <DialogTitle>Create New Proposal</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Enter the details for your new proposal
            </DialogContentText>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Function</InputLabel>
              <Select
                value={proposalFunction}
                onChange={(e) => setProposalFunction(e.target.value)}
                label="Function"
              >
                <MenuItem value="issue">Issue Certificate</MenuItem>
              </Select>
            </FormControl>
            <TextField
              id="name"
              name="email"
              label="Description"
              type="email"
              fullWidth
              variant="standard"
              onChange={(e) => setProposalDescription(e.target.value)}
            />
            <TextField
              fullWidth
              label="Parameters (JSON array)"
              value={proposalParams}
              onChange={(e) => setProposalParams(e.target.value)}
              multiline
              rows={2}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewProposalOpen(false)}>Cancel</Button>
            <Button onClick={createProposal} disabled={loading}>
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

export default App;